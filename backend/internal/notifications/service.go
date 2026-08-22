package notifications

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID         string     `json:"id"`
	Type       string     `json:"type"`
	Title      string     `json:"title"`
	Message    string     `json:"message"`
	EntityType *string    `json:"entity_type"`
	EntityID   *string    `json:"entity_id"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }

func (s *Service) Create(userID, kind, title, message, entityType, entityID string) error {
	return s.db.Exec(`INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id) VALUES(?,?,?,?,?,?)`, userID, kind, title, message, entityType, entityID).Error
}

func (s *Service) List(userID, read string, page, limit int) ([]Notification, int64, error) {
	q := s.db.Where("user_id = ?", userID)
	if read == "true" {
		q = q.Where("read_at IS NOT NULL")
	}
	if read == "false" {
		q = q.Where("read_at IS NULL")
	}
	var total int64
	if err := q.Model(&Notification{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var out []Notification
	err := q.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&out).Error
	return out, total, err
}

func (s *Service) UnreadCount(userID string) (int64, error) {
	var count int64
	return count, s.db.Model(&Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&count).Error
}

func (s *Service) MarkRead(id, userID string) (bool, error) {
	r := s.db.Model(&Notification{}).Where("id = ? AND user_id = ? AND read_at IS NULL", id, userID).Update("read_at", time.Now())
	return r.RowsAffected > 0, r.Error
}

func (s *Service) MarkAllRead(userID string) error {
	return s.db.Model(&Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Update("read_at", time.Now()).Error
}
