package main

import (
	"log"
	"time"

	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
	"github.com/winatabayu00/school-success-platform/backend/pkg/database"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}
	checkFollowUpOverdue(db)
	for range time.Tick(5 * time.Minute) {
		checkFollowUpOverdue(db)
	}
}

func checkFollowUpOverdue(db *gorm.DB) {
	result := db.Exec(`INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id)
		SELECT owner_id, 'FOLLOW_UP_OVERDUE', 'Follow-up overdue', reason, 'follow_up', id
		FROM client_follow_ups WHERE due_at < NOW() AND status IN ('OPEN','IN_PROGRESS')
		ON CONFLICT DO NOTHING`)
	if result.Error != nil {
		log.Printf("follow-up overdue notification check failed: %v", result.Error)
	}
}
