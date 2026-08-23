package feature_requests

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrNotFound        = errors.New("feature request not found")
	ErrInvalidState    = errors.New("invalid feature request state")
	ErrClientExists    = errors.New("client demand already exists")
	ErrVersionConflict = errors.New("version conflict")
)

type FeatureRequest struct {
	ID               string    `json:"id"`
	RequestNumber    string    `json:"request_number"`
	Title            string    `json:"title"`
	ProblemStatement string    `json:"problem_statement"`
	ExpectedOutcome  string    `json:"expected_outcome"`
	Status           string    `json:"status"`
	Priority         *string   `json:"priority"`
	ProductOwnerID   *string   `json:"product_owner_id"`
	RejectionReason  *string   `json:"rejection_reason"`
	DuplicateOfID    *string   `json:"duplicate_of_id"`
	FirstRequestedAt time.Time `json:"first_requested_at"`
	DemandCount      int64     `json:"demand_count"`
	OldestRequestAt  time.Time `json:"oldest_request_at"`
	Version          int       `json:"version"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
type ClientDemand struct {
	ClientID      string    `json:"client_id"`
	ClientName    string    `json:"client_name"`
	RequestedBy   string    `json:"requested_by"`
	RequestedAt   time.Time `json:"requested_at"`
	ClientContext *string   `json:"client_context"`
}
type Demand struct {
	ClientCount     int64     `json:"client_count"`
	OldestRequestAt time.Time `json:"oldest_request_at"`
}
type Detail struct {
	FeatureRequest    FeatureRequest `json:"feature_request"`
	RequestingClients []ClientDemand `json:"requesting_clients"`
	Demand            Demand         `json:"demand"`
}
type CreateInput struct{ ClientID, Title, ProblemStatement, ExpectedOutcome string }
type AddClientInput struct {
	ClientID      string
	ClientContext *string
}
type ListInput struct {
	Search, Status, Priority, ClientID, ProductOwnerID string
	Page, Limit                                        int
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }

func (s *Service) Create(in CreateInput, actor, request string) (FeatureRequest, error) {
	var out FeatureRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO feature_requests(title,problem_statement,expected_outcome) VALUES(?,?,?) RETURNING *`, in.Title, in.ProblemStatement, in.ExpectedOutcome).Scan(&out).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO feature_request_clients(feature_request_id,client_id,requested_by) VALUES(?,?,?)`, out.ID, in.ClientID, actor).Error; err != nil {
			return err
		}
		return audit(tx, actor, "FEATURE_REQUEST_CREATED", out.ID, nil, out, request)
	})
	return out, err
}
func (s *Service) ClientAccessible(clientID, userID string, scoped bool) (bool, error) {
	if !scoped {
		return true, nil
	}
	var count int64
	err := s.db.Table("client_owners").Where("client_id=? AND user_id=? AND unassigned_at IS NULL", clientID, userID).Count(&count).Error
	return count > 0, err
}
func (s *Service) List(in ListInput, userID string, scoped bool) ([]FeatureRequest, int64, error) {
	q := s.db.Table("feature_requests fr")
	if scoped {
		q = q.Where(`EXISTS (SELECT 1 FROM feature_request_clients frc JOIN client_owners co ON co.client_id=frc.client_id WHERE frc.feature_request_id=fr.id AND co.user_id=? AND co.unassigned_at IS NULL)`, userID)
	}
	if in.Search != "" {
		q = q.Where("(fr.title ILIKE ? OR fr.problem_statement ILIKE ?)", "%"+in.Search+"%", "%"+in.Search+"%")
	}
	if in.Status != "" {
		q = q.Where("fr.status=?", in.Status)
	}
	if in.Priority != "" {
		q = q.Where("fr.priority=?", in.Priority)
	}
	if in.ClientID != "" {
		q = q.Where("EXISTS (SELECT 1 FROM feature_request_clients frc WHERE frc.feature_request_id=fr.id AND frc.client_id=?)", in.ClientID)
	}
	if in.ProductOwnerID != "" {
		q = q.Where("fr.product_owner_id=?", in.ProductOwnerID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var out []FeatureRequest
	err := q.Select(`fr.*, (SELECT count(*) FROM feature_request_clients frc WHERE frc.feature_request_id=fr.id) demand_count, (SELECT min(requested_at) FROM feature_request_clients frc WHERE frc.feature_request_id=fr.id) oldest_request_at`).Order("fr.first_requested_at ASC").Offset((in.Page - 1) * in.Limit).Limit(in.Limit).Find(&out).Error
	return out, total, err
}
func (s *Service) Detail(id, userID string, scoped bool) (Detail, error) {
	d := Detail{RequestingClients: []ClientDemand{}}
	q := s.db.Where("id=?", id)
	if scoped {
		q = q.Where(`EXISTS (SELECT 1 FROM feature_request_clients frc JOIN client_owners co ON co.client_id=frc.client_id WHERE frc.feature_request_id=feature_requests.id AND co.user_id=? AND co.unassigned_at IS NULL)`, userID)
	}
	if err := q.First(&d.FeatureRequest).Error; err != nil {
		return d, missing(err)
	}
	if err := s.db.Raw(`SELECT frc.client_id,c.name client_name,frc.requested_by,frc.requested_at,frc.client_context FROM feature_request_clients frc JOIN clients c ON c.id=frc.client_id WHERE frc.feature_request_id=? ORDER BY frc.requested_at`, id).Scan(&d.RequestingClients).Error; err != nil {
		return d, err
	}
	if err := s.db.Raw(`SELECT count(*) client_count,min(requested_at) oldest_request_at FROM feature_request_clients WHERE feature_request_id=?`, id).Scan(&d.Demand).Error; err != nil {
		return d, err
	}
	return d, nil
}
func (s *Service) AddClient(id string, in AddClientInput, actor, request string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var fr FeatureRequest
		if err := tx.First(&fr, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if err := tx.Exec(`INSERT INTO feature_request_clients(feature_request_id,client_id,requested_by,client_context) VALUES(?,?,?,?)`, id, in.ClientID, actor, in.ClientContext).Error; err != nil {
			return ErrClientExists
		}
		return audit(tx, actor, "FEATURE_REQUEST_CLIENT_ADDED", id, nil, in, request)
	})
}
func (s *Service) Transition(id, to, reason, duplicateID string, version int, actor, request string) (FeatureRequest, error) {
	var out FeatureRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		before := out
		if !allowed(out.Status, to) {
			return ErrInvalidState
		}
		if version != out.Version {
			return ErrVersionConflict
		}
		updates := map[string]interface{}{"status": to, "version": out.Version + 1, "updated_at": time.Now()}
		if to == "REJECTED" {
			if reason == "" {
				return ErrInvalidState
			}
			updates["rejection_reason"] = reason
		}
		if to == "DUPLICATE" {
			if duplicateID == "" || duplicateID == id {
				return ErrInvalidState
			}
			var original FeatureRequest
			if err := tx.First(&original, "id=?", duplicateID).Error; err != nil {
				return ErrNotFound
			}
			updates["duplicate_of_id"] = duplicateID
		}
		if err := tx.Model(&out).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return err
		}
		return audit(tx, actor, "FEATURE_REQUEST_"+to, id, before, out, request)
	})
	return out, err
}
func allowed(from, to string) bool {
	return (from == "SUBMITTED" && to == "UNDER_REVIEW") || (from == "UNDER_REVIEW" && (to == "ACCEPTED" || to == "REJECTED" || to == "DUPLICATE")) || (from == "ACCEPTED" && to == "PLANNED") || (from == "PLANNED" && to == "IN_DEVELOPMENT") || (from == "IN_DEVELOPMENT" && to == "RELEASED") || (from == "RELEASED" && to == "DELIVERED")
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
	return tx.Exec(`INSERT INTO audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,request_id) VALUES(?,?, 'feature_request',?,?,?,?)`, actor, action, id, b, a, request).Error
}
