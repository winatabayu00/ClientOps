package main

import (
	"log"
	"time"

	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
	"github.com/winatabayu00/school-success-platform/backend/pkg/database"
	"gorm.io/gorm"
)

const followUpOverdueSQL = `INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id)
	SELECT owner_id, 'FOLLOW_UP_OVERDUE', 'Follow-up overdue', reason, 'follow_up', id
	FROM client_follow_ups WHERE due_at < NOW() AND status IN ('OPEN','IN_PROGRESS')
	ON CONFLICT DO NOTHING`

const slaApproachingSQL = `INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id)
	SELECT i.assignee_id, 'SLA_APPROACHING', 'SLA approaching', i.issue_number || ': ' || i.title, 'issue', i.id
	FROM issues i JOIN sla_policies sp ON sp.severity=i.severity AND sp.is_active
	WHERE i.assignee_id IS NOT NULL AND i.resolved_at IS NULL AND i.status NOT IN ('CLOSED','CANCELLED')
	AND NOW() >= i.reported_at + sp.resolution_minutes * INTERVAL '0.8 minute'
	AND NOW() < i.reported_at + sp.resolution_minutes * INTERVAL '1 minute'
	ON CONFLICT DO NOTHING`

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}
	runScheduledJobs(db)
	for range time.Tick(5 * time.Minute) {
		runScheduledJobs(db)
	}
}

func runScheduledJobs(db *gorm.DB) {
	for _, job := range []struct {
		name string
		sql  string
	}{
		{"follow-up overdue", followUpOverdueSQL},
		{"SLA approaching", slaApproachingSQL},
	} {
		if result := db.Exec(job.sql); result.Error != nil {
			log.Printf("%s notification check failed: %v", job.name, result.Error)
		}
	}
}
