package audit

import (
	"encoding/json"
	"gorm.io/gorm"
	"time"
)

type Log struct {
	ID           string          `json:"id"`
	ActorID      *string         `json:"actor_id"`
	ActorName    *string         `json:"actor_name"`
	Action       string          `json:"action"`
	ResourceType string          `json:"resource_type"`
	ResourceID   *string         `json:"resource_id"`
	Before       json.RawMessage `json:"before_data"`
	After        json.RawMessage `json:"after_data"`
	RequestID    *string         `json:"request_id"`
	CreatedAt    time.Time       `json:"created_at"`
}
type Filter struct {
	ActorID, Action, ResourceType, ResourceID string
	From, To                                  *time.Time
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }
func (s *Service) List(f Filter, page, limit int) ([]Log, int64, error) {
	q, args := auditQuery(f)
	var total int64
	if err := s.db.Raw("SELECT count(*) "+q, args...).Scan(&total).Error; err != nil {
		return nil, 0, err
	}
	var logs []Log
	err := s.db.Raw("SELECT a.id, a.actor_id, u.name actor_name, a.action, a.resource_type, a.resource_id, a.before_data, a.after_data, a.request_id, a.created_at "+q+" ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?", append(args, limit, (page-1)*limit)...).Scan(&logs).Error
	return logs, total, err
}
func (s *Service) Get(id string) (Log, error) {
	var log Log
	err := s.db.Raw(`SELECT a.id, a.actor_id, u.name actor_name, a.action, a.resource_type, a.resource_id, a.before_data, a.after_data, a.request_id, a.created_at FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE a.id = ?`, id).Scan(&log).Error
	if err == nil && log.ID == "" {
		return Log{}, gorm.ErrRecordNotFound
	}
	return log, err
}
func auditQuery(f Filter) (string, []interface{}) {
	q, args := "FROM audit_logs a WHERE 1=1", []interface{}{}
	for _, x := range []struct{ field, value string }{{"a.actor_id", f.ActorID}, {"a.action", f.Action}, {"a.resource_type", f.ResourceType}, {"a.resource_id", f.ResourceID}} {
		if x.value != "" {
			q += " AND " + x.field + " = ?"
			args = append(args, x.value)
		}
	}
	if f.From != nil {
		q += " AND a.created_at >= ?"
		args = append(args, *f.From)
	}
	if f.To != nil {
		q += " AND a.created_at <= ?"
		args = append(args, *f.To)
	}
	return q, args
}
