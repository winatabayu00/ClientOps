package operations

import (
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"time"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAccess        = errors.New("access denied")
	ErrState         = errors.New("invalid state")
	ErrDocumentation = errors.New("documentation required")
	ErrFollowUp      = errors.New("follow-up required")
)

type Handoff struct {
	ID               string     `json:"id"`
	ReleaseID        string     `json:"release_id"`
	ClientID         string     `json:"client_id"`
	OpsOwnerID       string     `json:"ops_owner_id"`
	Status           string     `json:"status"`
	RequiresFollowUp bool       `json:"requires_follow_up"`
	AcknowledgedAt   *time.Time `json:"acknowledged_at"`
	CompletedAt      *time.Time `json:"completed_at"`
}
type FollowUp struct {
	ID        string    `json:"id"`
	ClientID  string    `json:"client_id"`
	HandoffID *string   `json:"handoff_id"`
	OwnerID   string    `json:"owner_id"`
	Type      string    `json:"type"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	DueAt     time.Time `json:"due_at"`
	Result    *string   `json:"result"`
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }
func (Handoff) TableName() string     { return "operational_handoffs" }
func (FollowUp) TableName() string    { return "client_follow_ups" }
func (s *Service) Handoffs(client, release, owner, status string) ([]Handoff, error) {
	var out []Handoff
	q := s.db.Table("operational_handoffs")
	for _, f := range []struct{ v, c string }{{client, "client_id"}, {release, "release_id"}, {owner, "ops_owner_id"}, {status, "status"}} {
		if f.v != "" {
			q = q.Where(f.c+"=?", f.v)
		}
	}
	return out, q.Order("created_at DESC").Find(&out).Error
}
func (s *Service) GetHandoff(id string) (Handoff, error) {
	var out Handoff
	err := s.db.First(&out, "id=?", id).Error
	return out, missing(err)
}
func (s *Service) Acknowledge(id, actor, request string, manager bool) (Handoff, error) {
	var out Handoff
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if !manager && out.OpsOwnerID != actor {
			return ErrAccess
		}
		if out.Status != "PENDING" {
			return ErrState
		}
		before := out
		status := "ACKNOWLEDGED"
		if out.RequiresFollowUp {
			status = "FOLLOW_UP_REQUIRED"
		}
		now := time.Now()
		if err := tx.Model(&out).Updates(map[string]interface{}{"status": status, "acknowledged_at": now, "acknowledged_by": actor, "updated_at": now}).Error; err != nil {
			return err
		}
		return audit(tx, actor, "HANDOFF_ACKNOWLEDGED", out.ID, before, out, request)
	})
	return out, err
}
func (s *Service) CompleteHandoff(id, actor, request string, manager bool) (Handoff, error) {
	var out Handoff
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if !manager && out.OpsOwnerID != actor {
			return ErrAccess
		}
		var docs int64
		if err := tx.Table("release_documentations rd").Joins("JOIN documentations d ON d.id=rd.documentation_id AND d.status='PUBLISHED'").Where("rd.release_id=?", out.ReleaseID).Count(&docs).Error; err != nil {
			return err
		}
		var followUps int64
		if out.RequiresFollowUp {
			if err := tx.Table("client_follow_ups").Where("handoff_id=? AND status='COMPLETED'", id).Count(&followUps).Error; err != nil {
				return err
			}
		}
		if err := canCompleteHandoff(out.Status, out.RequiresFollowUp, docs, followUps); err != nil {
			return err
		}
		before := out
		now := time.Now()
		if err := tx.Model(&out).Updates(map[string]interface{}{"status": "COMPLETED", "completed_at": now, "completed_by": actor, "updated_at": now}).Error; err != nil {
			return err
		}
		return audit(tx, actor, "HANDOFF_COMPLETED", id, before, out, request)
	})
	return out, err
}
func canCompleteHandoff(status string, requiresFollowUp bool, publishedDocuments, completedFollowUps int64) error {
	if status != "ACKNOWLEDGED" && status != "FOLLOWED_UP" {
		return ErrState
	}
	if publishedDocuments == 0 {
		return ErrDocumentation
	}
	if requiresFollowUp && completedFollowUps == 0 {
		return ErrFollowUp
	}
	return nil
}
func (s *Service) FollowUps(client, owner, status string) ([]FollowUp, error) {
	var out []FollowUp
	q := s.db.Table("client_follow_ups")
	for _, f := range []struct{ v, c string }{{client, "client_id"}, {owner, "owner_id"}, {status, "status"}} {
		if f.v != "" {
			q = q.Where(f.c+"=?", f.v)
		}
	}
	return out, q.Order("due_at").Find(&out).Error
}
func (s *Service) CreateFollowUp(in FollowUp, actor, request string, manager bool) (FollowUp, error) {
	var out FollowUp
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if !manager && in.OwnerID != actor {
			return ErrAccess
		}
		if in.HandoffID != nil {
			var h Handoff
			if err := tx.First(&h, "id=?", *in.HandoffID).Error; err != nil {
				return missing(err)
			}
			if h.ClientID != in.ClientID {
				return ErrState
			}
		}
		if err := tx.Raw(`INSERT INTO client_follow_ups(client_id,handoff_id,owner_id,type,reason,due_at) VALUES(?,?,?,?,?,?) RETURNING *`, in.ClientID, in.HandoffID, in.OwnerID, in.Type, in.Reason, in.DueAt).Scan(&out).Error; err != nil {
			return err
		}
		return audit(tx, actor, "FOLLOW_UP_CREATED", out.ID, nil, out, request)
	})
	return out, err
}
func (s *Service) StartFollowUp(id, actor, request string, manager bool) (FollowUp, error) {
	return s.followState(id, "OPEN", "IN_PROGRESS", nil, actor, request, manager)
}
func (s *Service) CompleteFollowUp(id, result, actor, request string, manager bool) (FollowUp, error) {
	if result == "" {
		return FollowUp{}, ErrState
	}
	return s.followState(id, "IN_PROGRESS", "COMPLETED", &result, actor, request, manager)
}
func (s *Service) followState(id, from, to string, result *string, actor, request string, manager bool) (FollowUp, error) {
	var out FollowUp
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if !manager && out.OwnerID != actor {
			return ErrAccess
		}
		if out.Status != from {
			return ErrState
		}
		before := out
		f := map[string]interface{}{"status": to, "updated_at": time.Now()}
		if to == "IN_PROGRESS" {
			f["started_at"] = time.Now()
		}
		if to == "COMPLETED" {
			f["completed_at"] = time.Now()
			f["result"] = *result
			if out.HandoffID != nil {
				tx.Model(&Handoff{}).Where("id=? AND status='FOLLOW_UP_REQUIRED'", *out.HandoffID).Updates(map[string]interface{}{"status": "FOLLOWED_UP", "updated_at": time.Now()})
			}
		}
		if err := tx.Model(&out).Updates(f).Error; err != nil {
			return err
		}
		return audit(tx, actor, "FOLLOW_UP_"+to, id, before, out, request)
	})
	return out, err
}
func missing(e error) error {
	if errors.Is(e, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return e
}
func audit(tx *gorm.DB, actor, action, id string, before, after interface{}, request string) error {
	b, _ := json.Marshal(before)
	a, _ := json.Marshal(after)
	return tx.Exec(`INSERT INTO audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,request_id) VALUES(?,?, 'operational',?,?,?,?)`, actor, action, id, b, a, request).Error
}
