package docs

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrNotFound     = errors.New("documentation not found")
	ErrInvalidState = errors.New("invalid documentation state")
	ErrConflict     = errors.New("documentation version conflict")
)

type Document struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Summary        string     `json:"summary"`
	Content        string     `json:"content"`
	Status         string     `json:"status"`
	AuthorID       string     `json:"author_id"`
	LastReviewedAt *time.Time `json:"last_reviewed_at"`
	Version        int        `json:"version"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }
func (Document) TableName() string    { return "documentations" }

func (s *Service) Create(title, summary, content, actor, request string) (Document, error) {
	var out Document
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO documentations(title,summary,content,author_id) VALUES(?,?,?,?) RETURNING *`, title, summary, content, actor).Scan(&out).Error; err != nil {
			return err
		}
		return audit(tx, actor, "DOCUMENTATION_CREATED", out.ID, nil, out, request)
	})
	return out, err
}

func (s *Service) List() ([]Document, error) {
	var out []Document
	return out, s.db.Order("created_at DESC").Find(&out).Error
}

func (s *Service) Get(id string) (Document, error) {
	var out Document
	return out, missing(s.db.First(&out, "id=?", id).Error)
}

func (s *Service) Edit(id, title, summary, content string, version int, actor, request string) (Document, error) {
	return s.mutate(id, "DRAFT", "", title, summary, content, version, actor, request)
}

func (s *Service) SubmitReview(id string, version int, actor, request string) (Document, error) {
	return s.mutate(id, "DRAFT", "IN_REVIEW", "", "", "", version, actor, request)
}

func (s *Service) Publish(id string, version int, actor, request string) (Document, error) {
	return s.mutate(id, "IN_REVIEW", "PUBLISHED", "", "", "", version, actor, request)
}

func (s *Service) Archive(id string, version int, actor, request string) (Document, error) {
	return s.mutate(id, "", "ARCHIVED", "", "", "", version, actor, request)
}

func (s *Service) LinkRelease(id, releaseID, actor, request string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var d Document
		if err := tx.First(&d, "id=?", id).Error; err != nil {
			return missing(err)
		}
		var n int64
		if err := tx.Table("releases").Where("id=?", releaseID).Count(&n).Error; err != nil {
			return err
		}
		if n == 0 {
			return ErrNotFound
		}
		if err := tx.Exec(`INSERT INTO release_documentations(release_id,documentation_id) VALUES(?,?) ON CONFLICT DO NOTHING`, releaseID, id).Error; err != nil {
			return err
		}
		return audit(tx, actor, "DOCUMENTATION_RELEASE_LINKED", id, nil, map[string]string{"release_id": releaseID}, request)
	})
}

func (s *Service) LinkFeatureRequest(id, featureRequestID, actor, request string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var d Document
		if err := tx.First(&d, "id=?", id).Error; err != nil {
			return missing(err)
		}
		var n int64
		if err := tx.Table("feature_requests").Where("id=?", featureRequestID).Count(&n).Error; err != nil {
			return err
		}
		if n == 0 {
			return ErrNotFound
		}
		if err := tx.Exec(`INSERT INTO feature_request_documentations(feature_request_id,documentation_id) VALUES(?,?) ON CONFLICT DO NOTHING`, featureRequestID, id).Error; err != nil {
			return err
		}
		return audit(tx, actor, "DOCUMENTATION_FEATURE_REQUEST_LINKED", id, nil, map[string]string{"feature_request_id": featureRequestID}, request)
	})
}

func (s *Service) mutate(id, from, to, title, summary, content string, version int, actor, request string) (Document, error) {
	var out Document
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return missing(err)
		}
		if (from != "" && out.Status != from) || terminal(out.Status) {
			return ErrInvalidState
		}
		before := out
		fields := map[string]interface{}{"updated_at": time.Now(), "version": out.Version + 1}
		if title != "" {
			fields["title"], fields["summary"], fields["content"] = title, summary, content
		}
		if to != "" {
			fields["status"] = to
		}
		if to == "PUBLISHED" {
			fields["last_reviewed_at"] = time.Now()
		}
		result := tx.Model(&Document{}).Where("id=? AND version=?", id, version).Updates(fields)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrConflict
		}
		if err := tx.First(&out, "id=?", id).Error; err != nil {
			return err
		}
		return audit(tx, actor, "DOCUMENTATION_"+out.Status, id, before, out, request)
	})
	return out, err
}

func terminal(status string) bool { return status == "ARCHIVED" }

func missing(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}

func audit(tx *gorm.DB, actor, action, id string, before, after interface{}, request string) error {
	b, _ := json.Marshal(before)
	a, _ := json.Marshal(after)
	return tx.Exec(`INSERT INTO audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,request_id) VALUES(?,?, 'documentation',?,?,?,?)`, actor, action, id, b, a, request).Error
}
