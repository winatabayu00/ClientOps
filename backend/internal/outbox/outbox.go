package outbox

import (
	"encoding/json"

	"gorm.io/gorm"
)

const NotificationCreated = "NOTIFICATION_CREATED"

type Notification struct {
	UserID, Type, Title, Message, EntityType, EntityID string
}

func Notify(tx *gorm.DB, n Notification) error {
	payload, err := json.Marshal(n)
	if err != nil {
		return err
	}
	return tx.Exec(`INSERT INTO outbox_events(type, payload) VALUES (?, ?::jsonb)`, NotificationCreated, payload).Error
}
