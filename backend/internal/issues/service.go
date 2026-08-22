package issues

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrNotFound           = errors.New("not found")
	ErrVersionConflict    = errors.New("version conflict")
	ErrInvalidTransition  = errors.New("invalid status transition")
	ErrAssigneeRequired   = errors.New("assignee required")
	ErrReleaseRequired    = errors.New("release required")
	ErrOperationalClosure = errors.New("operational closure required")
)

type Issue struct {
	ID                string     `json:"id"`
	IssueNumber       string     `json:"issue_number"`
	ClientID          string     `json:"client_id"`
	Title             string     `json:"title"`
	Description       string     `json:"description"`
	Category          string     `json:"category"`
	Severity          string     `json:"severity"`
	Status            string     `json:"status"`
	ReporterID        string     `gorm:"column:reporter_id" json:"reporter_id"`
	AssigneeID        *string    `json:"assignee_id"`
	ReleaseID         *string    `json:"release_id"`
	ResolutionSummary *string    `json:"resolution_summary"`
	Version           int        `json:"version"`
	ReportedAt        time.Time  `json:"reported_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	TriagedAt         *time.Time `json:"triaged_at"`
	ResolvedAt        *time.Time `json:"resolved_at"`
	ClosedAt          *time.Time `json:"closed_at"`
}
type History struct {
	ID         string    `json:"id"`
	IssueID    string    `json:"issue_id"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	ChangedBy  string    `json:"changed_by"`
	Reason     *string   `json:"reason"`
	CreatedAt  time.Time `json:"created_at"`
}
type CreateInput struct {
	ClientID, Title, Description string
	Category, Severity           *string
}
type UpdateInput struct {
	Title, Description, Category, Severity *string
	Version                                int
}
type ListInput struct {
	Page, Limit                                                                       int
	Search, ClientID, Status, Severity, Category, AssigneeID, ReporterID, Sort, Order string
}
type TransitionInput struct {
	Version                                                              int
	Reason, AssigneeID, ReleaseID, ResolutionSummary, Category, Severity *string
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func (s *Service) Create(in CreateInput, actorID, requestID string) (Issue, error) {
	var out Issue
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO issues (client_id,title,description,category,severity,reporter_id) VALUES (?,?,?,?,?,?) RETURNING *`, in.ClientID, in.Title, in.Description, in.Category, in.Severity, actorID).Scan(&out).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO issue_status_histories (issue_id,to_status,changed_by) VALUES (?,'REPORTED',?)`, out.ID, actorID).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "ISSUE_CREATED", out.ID, nil, out, requestID)
	})
	return out, err
}
func (s *Service) List(in ListInput, userID string, scoped bool) ([]Issue, int64, error) {
	q := s.db.Table("issues i")
	if scoped {
		q = q.Where(`EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id=i.client_id AND co.user_id=? AND co.unassigned_at IS NULL)`, userID)
	}
	for _, filter := range []struct{ value, column string }{{in.ClientID, "i.client_id"}, {in.Status, "i.status"}, {in.Severity, "i.severity"}, {in.Category, "i.category"}, {in.AssigneeID, "i.assignee_id"}, {in.ReporterID, "i.reporter_id"}} {
		if filter.value != "" {
			q = q.Where(filter.column+" = ?", filter.value)
		}
	}
	if in.Search != "" {
		q = q.Where("(i.title ILIKE ? OR i.issue_number ILIKE ?)", "%"+in.Search+"%", "%"+in.Search+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	sort := map[string]string{"created_at": "i.created_at", "reported_at": "i.reported_at", "updated_at": "i.updated_at", "severity": "i.severity"}[in.Sort]
	if sort == "" {
		sort = "i.reported_at"
	}
	order := "ASC"
	if in.Order == "desc" {
		order = "DESC"
	}
	var out []Issue
	err := q.Order(sort + " " + order).Offset((in.Page - 1) * in.Limit).Limit(in.Limit).Find(&out).Error
	return out, total, err
}
func (s *Service) Get(id, userID string, scoped bool) (Issue, error) {
	var out Issue
	q := s.db.Table("issues i").Where("i.id = ?", id)
	if scoped {
		q = q.Where(`EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id=i.client_id AND co.user_id=? AND co.unassigned_at IS NULL)`, userID)
	}
	err := q.First(&out).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return out, ErrNotFound
	}
	return out, err
}
func (s *Service) Update(id string, in UpdateInput, actorID, requestID string) (Issue, error) {
	var out Issue
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var before Issue
		if err := tx.First(&before, "id = ?", id).Error; err != nil {
			return missing(err)
		}
		fields := map[string]interface{}{"version": gorm.Expr("version + 1"), "updated_at": time.Now()}
		if in.Title != nil {
			fields["title"] = *in.Title
		}
		if in.Description != nil {
			fields["description"] = *in.Description
		}
		if in.Category != nil {
			fields["category"] = *in.Category
		}
		if in.Severity != nil {
			fields["severity"] = *in.Severity
		}
		r := tx.Table("issues").Where("id = ? AND version = ?", id, in.Version).Updates(fields)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected == 0 {
			return ErrVersionConflict
		}
		if err := tx.First(&out, "id = ?", id).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "ISSUE_UPDATED", id, before, out, requestID)
	})
	return out, err
}
func (s *Service) Assign(id string, in TransitionInput, actorID, requestID string) (Issue, error) {
	return s.mutate(id, in, actorID, requestID, "ISSUE_ASSIGNED", "", func(_ *gorm.DB, fields map[string]interface{}, current Issue) error {
		if in.AssigneeID == nil {
			return ErrAssigneeRequired
		}
		fields["assignee_id"] = *in.AssigneeID
		return nil
	})
}
func (s *Service) Transition(id, to string, in TransitionInput, actorID, requestID string) (Issue, error) {
	return s.mutate(id, in, actorID, requestID, "ISSUE_STATUS_CHANGED", to, func(tx *gorm.DB, fields map[string]interface{}, current Issue) error {
		if !allowed(current.Status, to) {
			return ErrInvalidTransition
		}
		if to == "INVESTIGATING" && current.AssigneeID == nil {
			return ErrAssigneeRequired
		}
		if to == "RELEASED" && in.ReleaseID == nil {
			return ErrReleaseRequired
		}
		if to == "CLOSED" {
			var pending int64
			if err := tx.Table("operational_handoffs").Where("release_id = ? AND client_id = ? AND status <> 'COMPLETED'", current.ReleaseID, current.ClientID).Count(&pending).Error; err != nil {
				return err
			}
			if pending > 0 {
				return ErrOperationalClosure
			}
		}
		if in.Category != nil {
			fields["category"] = *in.Category
		}
		if in.Severity != nil {
			fields["severity"] = *in.Severity
		}
		if to == "TRIAGED" && ((current.Category == "" && in.Category == nil) || (current.Severity == "" && in.Severity == nil)) {
			return ErrInvalidTransition
		}
		if in.ReleaseID != nil {
			fields["release_id"] = *in.ReleaseID
		}
		if in.ResolutionSummary != nil {
			fields["resolution_summary"] = *in.ResolutionSummary
		}
		now := time.Now()
		if to == "TRIAGED" {
			fields["triaged_at"] = now
		}
		if to == "RELEASED" {
			fields["resolved_at"] = now
		}
		if to == "CLOSED" {
			fields["closed_at"] = now
		}
		return nil
	})
}
func (s *Service) mutate(id string, in TransitionInput, actorID, requestID, action, to string, change func(*gorm.DB, map[string]interface{}, Issue) error) (Issue, error) {
	var out Issue
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var before Issue
		if err := tx.First(&before, "id = ?", id).Error; err != nil {
			return missing(err)
		}
		fields := map[string]interface{}{"version": gorm.Expr("version + 1"), "updated_at": time.Now()}
		if err := change(tx, fields, before); err != nil {
			return err
		}
		if to != "" {
			fields["status"] = to
		}
		r := tx.Table("issues").Where("id = ? AND version = ?", id, in.Version).Updates(fields)
		if r.Error != nil {
			return r.Error
		}
		if r.RowsAffected == 0 {
			return ErrVersionConflict
		}
		if to != "" {
			if err := tx.Exec(`INSERT INTO issue_status_histories (issue_id,from_status,to_status,changed_by,reason) VALUES (?,?,?,?,?)`, id, before.Status, to, actorID, in.Reason).Error; err != nil {
				return err
			}
		}
		if err := tx.First(&out, "id = ?", id).Error; err != nil {
			return err
		}
		return audit(tx, actorID, action, id, before, out, requestID)
	})
	return out, err
}
func (s *Service) History(id string) ([]History, error) {
	var out []History
	return out, s.db.Where("issue_id = ?", id).Order("created_at").Find(&out).Error
}
func missing(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}
func audit(tx *gorm.DB, actor, action, id string, before, after interface{}, requestID string) error {
	beforeJSON, err := json.Marshal(before)
	if err != nil {
		return err
	}
	afterJSON, err := json.Marshal(after)
	if err != nil {
		return err
	}
	return tx.Exec(`INSERT INTO audit_logs (actor_id,action,resource_type,resource_id,before_data,after_data,request_id) VALUES (?,'`+action+`','issue',?,?,?,?)`, actor, id, beforeJSON, afterJSON, requestID).Error
}
func allowed(from, to string) bool {
	return map[string]string{"REPORTED": "TRIAGED", "TRIAGED": "INVESTIGATING", "INVESTIGATING": "IN_DEVELOPMENT", "IN_DEVELOPMENT": "QA", "QA": "RELEASED", "RELEASED": "FOLLOW_UP", "FOLLOW_UP": "CLOSED", "CLOSED": "REOPENED", "REOPENED": "TRIAGED"}[from] == to || (from == "QA" && to == "IN_DEVELOPMENT")
}
