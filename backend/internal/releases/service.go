package releases

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrNotFound      = errors.New("release not found")
	ErrInvalidState  = errors.New("invalid release state")
	ErrItemsRequired = errors.New("release items required")
	ErrOwnerRequired = errors.New("client owner required")
)

type Release struct {
	ID          string     `json:"id"`
	Version     string     `json:"version"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	Status      string     `json:"status"`
	ReleaseDate *time.Time `json:"release_date"`
	CreatedBy   string     `json:"created_by"`
	PublishedBy *string    `json:"published_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
type Item struct {
	ID          string `json:"id"`
	ReleaseID   string `json:"release_id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
}
type Impact struct {
	ClientID         string `json:"client_id"`
	ImpactType       string `json:"impact_type"`
	RequiresFollowUp bool   `json:"requires_follow_up"`
}
type Detail struct {
	Release        Release          `json:"release"`
	Items          []Item           `json:"items"`
	Impacts        []Impact         `json:"affected_clients"`
	HandoffSummary map[string]int64 `json:"handoff_summary"`
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }
func (Item) TableName() string        { return "release_items" }
func (Impact) TableName() string      { return "release_impacts" }

func (s *Service) Create(version, title, summary, actor, request string) (Release, error) {
	var out Release
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO releases(version,title,summary,created_by) VALUES(?,?,?,?) RETURNING *`, version, title, summary, actor).Scan(&out).Error; err != nil {
			return err
		}
		return audit(tx, actor, "RELEASE_CREATED", out.ID, nil, out, request)
	})
	return out, err
}
func (s *Service) List() ([]Release, error) {
	var out []Release
	return out, s.db.Order("created_at DESC").Find(&out).Error
}
func (s *Service) Detail(id string) (Detail, error) {
	var d Detail
	if err := s.db.First(&d.Release, "id=?", id).Error; err != nil {
		return d, missing(err)
	}
	if err := s.db.Where("release_id=?", id).Find(&d.Items).Error; err != nil {
		return d, err
	}
	if err := s.db.Where("release_id=?", id).Find(&d.Impacts).Error; err != nil {
		return d, err
	}
	d.HandoffSummary = map[string]int64{}
	var rows []struct {
		Status string
		Total  int64
	}
	if err := s.db.Table("operational_handoffs").Select("status,count(*) total").Where("release_id=?", id).Group("status").Scan(&rows).Error; err != nil {
		return d, err
	}
	for _, r := range rows {
		d.HandoffSummary[r.Status] = r.Total
	}
	return d, nil
}
func (s *Service) AddItem(id, typ, title, description string, issueIDs []string, actor, request string) (Item, error) {
	var out Item
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var r Release
		if err := tx.First(&r, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if r.Status != "DRAFT" {
			return ErrInvalidState
		}
		if err := tx.Raw(`INSERT INTO release_items(release_id,type,title,description) VALUES(?,?,?,?) RETURNING *`, id, typ, title, description).Scan(&out).Error; err != nil {
			return err
		}
		for _, issue := range issueIDs {
			if err := tx.Exec(`INSERT INTO release_item_issues(release_item_id,issue_id) VALUES(?,?)`, out.ID, issue).Error; err != nil {
				return err
			}
		}
		return audit(tx, actor, "RELEASE_ITEM_ADDED", out.ID, nil, out, request)
	})
	return out, err
}
func (s *Service) SetImpacts(id string, impacts []Impact, actor, request string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var r Release
		if err := tx.First(&r, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if r.Status != "DRAFT" {
			return ErrInvalidState
		}
		for _, i := range impacts {
			if err := tx.Exec(`INSERT INTO release_impacts(release_id,client_id,impact_type,requires_follow_up) VALUES(?,?,?,?) ON CONFLICT(release_id,client_id) DO UPDATE SET impact_type=EXCLUDED.impact_type,requires_follow_up=EXCLUDED.requires_follow_up`, id, i.ClientID, i.ImpactType, i.RequiresFollowUp).Error; err != nil {
				return err
			}
		}
		return audit(tx, actor, "RELEASE_IMPACTS_SET", id, nil, impacts, request)
	})
}
func (s *Service) Ready(id, actor, request string) (Release, error) {
	return s.state(id, "DRAFT", "READY", actor, request)
}
func (s *Service) Publish(id, actor, request string) (int64, error) {
	var count int64
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var r Release
		if err := tx.First(&r, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if r.Status != "READY" {
			return ErrInvalidState
		}
		var items int64
		if err := tx.Table("release_items").Where("release_id=?", id).Count(&items).Error; err != nil {
			return err
		}
		if items == 0 {
			return ErrItemsRequired
		}
		var impacts []Impact
		if err := tx.Where("release_id=?", id).Find(&impacts).Error; err != nil {
			return err
		}
		for _, i := range impacts {
			var owner string
			if err := tx.Raw(`SELECT user_id FROM client_owners WHERE client_id=? AND owner_type='PRIMARY' AND unassigned_at IS NULL`, i.ClientID).Scan(&owner).Error; err != nil {
				return err
			}
			if owner == "" {
				return ErrOwnerRequired
			}
			status := "PENDING"
			if err := tx.Exec(`INSERT INTO operational_handoffs(release_id,client_id,ops_owner_id,status,requires_follow_up) VALUES(?,?,?,?,?)`, id, i.ClientID, owner, status, i.RequiresFollowUp).Error; err != nil {
				return err
			}
			if err := tx.Exec(`INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id)
				VALUES (?, 'RELEASE_PUBLISHED', 'Release published', ?, 'release', ?)
				ON CONFLICT DO NOTHING`, owner, r.Version+": "+r.Title, id).Error; err != nil {
				return err
			}
			count++
		}
		before := r
		if err := tx.Model(&r).Updates(map[string]interface{}{"status": "PUBLISHED", "release_date": time.Now(), "published_by": actor, "updated_at": time.Now()}).Error; err != nil {
			return err
		}
		return audit(tx, actor, "RELEASE_PUBLISHED", id, before, r, request)
	})
	return count, err
}
func (s *Service) state(id, from, to, actor, request string) (Release, error) {
	var out Release
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if out.Status != from {
			return ErrInvalidState
		}
		before := out
		if err := tx.Model(&out).Updates(map[string]interface{}{"status": to, "updated_at": time.Now()}).Error; err != nil {
			return err
		}
		return audit(tx, actor, "RELEASE_"+to, id, before, out, request)
	})
	return out, err
}
func missing(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}
func audit(tx *gorm.DB, actor, action, id string, before, after interface{}, request string) error {
	b, _ := json.Marshal(before)
	a, _ := json.Marshal(after)
	return tx.Exec(`INSERT INTO audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,request_id) VALUES(?,?, 'release',?,?,?,?)`, actor, action, id, b, a, request).Error
}
