package dashboard

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type Overview struct {
	Issues struct {
		Open     int64 `json:"open"`
		Critical int64 `json:"critical"`
	} `json:"issues"`
	Clients struct {
		Active int64 `json:"active"`
	} `json:"clients"`
	FollowUps struct {
		Pending int64 `json:"pending"`
		Overdue int64 `json:"overdue"`
	} `json:"follow_ups"`
	Handoffs struct {
		Pending int64 `json:"pending"`
	} `json:"handoffs"`
}

type TimelineInput struct {
	Page, Limit int
	Type        string
	From, To    *time.Time
}

type TimelineEvent struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	Title      string    `json:"title"`
	ResourceID string    `json:"resource_id"`
	Resource   string    `json:"resource_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func scope(q *gorm.DB, alias, userID string, scoped bool) *gorm.DB {
	if scoped {
		return q.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = "+alias+".id AND co.user_id = ? AND co.unassigned_at IS NULL)", userID)
	}
	return q
}

func (s *Service) Overview(userID string, scoped bool) (Overview, error) {
	var out Overview
	clients := scope(s.db.Table("clients c").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := clients.Where("c.status = 'ACTIVE'").Count(&out.Clients.Active).Error; err != nil {
		return out, err
	}
	issues := scope(s.db.Table("issues i JOIN clients c ON c.id = i.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := issues.Where("i.status NOT IN ('CLOSED', 'CANCELLED')").Count(&out.Issues.Open).Error; err != nil {
		return out, err
	}
	if err := issues.Where("i.status NOT IN ('CLOSED', 'CANCELLED') AND i.severity = 'CRITICAL'").Count(&out.Issues.Critical).Error; err != nil {
		return out, err
	}
	followUps := scope(s.db.Table("client_follow_ups f JOIN clients c ON c.id = f.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := followUps.Where("f.status IN ('OPEN', 'IN_PROGRESS')").Count(&out.FollowUps.Pending).Error; err != nil {
		return out, err
	}
	if err := followUps.Where("f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW()").Count(&out.FollowUps.Overdue).Error; err != nil {
		return out, err
	}
	handoffs := scope(s.db.Table("operational_handoffs h JOIN clients c ON c.id = h.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := handoffs.Where("h.status = 'PENDING'").Count(&out.Handoffs.Pending).Error; err != nil {
		return out, err
	}
	return out, nil
}

const timelineEvents = `
SELECT i.id, 'ISSUE_REPORTED' AS type, 'Issue ' || i.issue_number || ' reported' AS title, i.id AS resource_id, 'issue' AS resource_type, i.reported_at AS occurred_at FROM issues i WHERE i.client_id = ?
UNION ALL SELECT h.id, 'ISSUE_STATUS_CHANGED', 'Issue status changed to ' || h.to_status, h.issue_id, 'issue', h.created_at FROM issue_status_histories h JOIN issues i ON i.id = h.issue_id WHERE i.client_id = ?
UNION ALL SELECT ri.id, 'RELEASE_IMPACT_IDENTIFIED', 'Release impact identified', ri.release_id, 'release', ri.created_at FROM release_impacts ri WHERE ri.client_id = ?
UNION ALL SELECT h.id, 'HANDOFF_CREATED', 'Operational handoff created', h.id, 'handoff', h.created_at FROM operational_handoffs h WHERE h.client_id = ?
UNION ALL SELECT h.id, 'HANDOFF_ACKNOWLEDGED', 'Operational handoff acknowledged', h.id, 'handoff', h.acknowledged_at FROM operational_handoffs h WHERE h.client_id = ? AND h.acknowledged_at IS NOT NULL
UNION ALL SELECT h.id, 'HANDOFF_COMPLETED', 'Operational handoff completed', h.id, 'handoff', h.completed_at FROM operational_handoffs h WHERE h.client_id = ? AND h.completed_at IS NOT NULL
UNION ALL SELECT f.id, 'FOLLOW_UP_CREATED', 'Client follow-up created', f.id, 'follow_up', f.created_at FROM client_follow_ups f WHERE f.client_id = ?
UNION ALL SELECT f.id, 'FOLLOW_UP_COMPLETED', 'Client follow-up completed', f.id, 'follow_up', f.completed_at FROM client_follow_ups f WHERE f.client_id = ? AND f.completed_at IS NOT NULL`

func (s *Service) Timeline(clientID, userID string, scoped bool, in TimelineInput) ([]TimelineEvent, int64, error) {
	client := scope(s.db.Table("clients c").Where("c.id = ? AND c.archived_at IS NULL", clientID), "c", userID, scoped)
	var exists bool
	if err := client.Select("COUNT(*) > 0").Scan(&exists).Error; err != nil {
		return nil, 0, err
	}
	if !exists {
		return nil, 0, ErrNotFound
	}
	args := []interface{}{clientID, clientID, clientID, clientID, clientID, clientID, clientID, clientID}
	q := s.db.Table("("+timelineEvents+") events", args...)
	if in.Type != "" {
		q = q.Where("type = ?", in.Type)
	}
	if in.From != nil {
		q = q.Where("occurred_at >= ?", *in.From)
	}
	if in.To != nil {
		q = q.Where("occurred_at <= ?", *in.To)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var events []TimelineEvent
	err := q.Order("occurred_at DESC").Offset((in.Page - 1) * in.Limit).Limit(in.Limit).Scan(&events).Error
	return events, total, err
}
