package main

import (
	"encoding/json"
	"log"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"github.com/winatabayu00/school-success-platform/backend/internal/outbox"
	"github.com/winatabayu00/school-success-platform/backend/pkg/cache"
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
	runJobs(db, cfg.SMTPURL, cache.New(cfg.RedisAddr))
	for range time.Tick(5 * time.Minute) {
		runJobs(db, cfg.SMTPURL, cache.New(cfg.RedisAddr))
	}
}

func runJobs(db *gorm.DB, smtpURL string, caches *cache.Client) {
	runScheduledJobs(db)
	dispatchOutbox(db, smtpURL)
	caches.InvalidateDashboard()
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

type event struct {
	ID, Type string
	Payload  json.RawMessage
}

func dispatchOutbox(db *gorm.DB, smtpURL string) {
	var events []event
	if err := db.Raw(`WITH claimed AS (SELECT id FROM outbox_events WHERE processed_at IS NULL AND available_at <= NOW() ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED) UPDATE outbox_events o SET available_at=NOW()+INTERVAL '5 minutes' FROM claimed WHERE o.id=claimed.id RETURNING o.id,o.type,o.payload`).Scan(&events).Error; err != nil {
		log.Printf("outbox claim failed: %v", err)
		return
	}
	for _, e := range events {
		if err := dispatch(db, e, smtpURL); err != nil {
			log.Printf("outbox event %s failed: %v", e.ID, err)
			db.Exec(`UPDATE outbox_events SET attempts=attempts+1,last_error=?,available_at=NOW()+INTERVAL '5 minutes' WHERE id=?`, err.Error(), e.ID)
		}
	}
}

func dispatch(db *gorm.DB, e event, smtpURL string) error {
	if e.Type != outbox.NotificationCreated {
		return db.Exec("UPDATE outbox_events SET processed_at=NOW() WHERE id=?", e.ID).Error
	}
	var n outbox.Notification
	if err := json.Unmarshal(e.Payload, &n); err != nil {
		return err
	}
	if err := db.Exec(`INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING`, n.UserID, n.Type, n.Title, n.Message, n.EntityType, n.EntityID).Error; err != nil {
		return err
	}
	var email string
	if err := db.Raw("SELECT email FROM users WHERE id=?", n.UserID).Scan(&email).Error; err != nil {
		return err
	}
	if err := sendMail(smtpURL, email, n.Title, n.Message); err != nil {
		return err
	}
	return db.Exec("UPDATE outbox_events SET processed_at=NOW(),last_error=NULL WHERE id=?", e.ID).Error
}

func sendMail(rawURL, to, subject, body string) error {
	if rawURL == "" || to == "" {
		return nil
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return err
	}
	from := u.Query().Get("from")
	if from == "" {
		return nil
	}
	host := u.Host
	username := ""
	password := ""
	if u.User != nil {
		username = u.User.Username()
		password, _ = u.User.Password()
	}
	server := strings.Split(host, ":")[0]
	var auth smtp.Auth
	if username != "" {
		auth = smtp.PlainAuth("", username, password, server)
	}
	return smtp.SendMail(host, auth, from, []string{to}, []byte("To: "+to+"\r\nFrom: "+from+"\r\nSubject: "+subject+"\r\n\r\n"+body+"\r\n"))
}
