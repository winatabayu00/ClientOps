package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type record struct {
	name        string
	description string
}

var roles = []record{
	{"SUPER_ADMIN", "System administrator"},
	{"OPS_MANAGER", "Operations manager"},
	{"OPS_STAFF", "Operations staff"},
	{"PRODUCT", "Product team member"},
	{"ENGINEER", "Engineering team member"},
}

var permissions = []record{
	{"client.read", "View clients"}, {"client.create", "Create clients"}, {"client.update", "Update clients"}, {"client.archive", "Archive clients"}, {"client.assign_owner", "Assign client owners"}, {"client.read_health", "View client health"}, {"client.read_timeline", "View client timeline"},
	{"issue.read", "View issues"}, {"issue.create", "Create issues"}, {"issue.update", "Update issues"}, {"issue.assign", "Assign issues"}, {"issue.triage", "Triage issues"}, {"issue.investigate", "Investigate issues"}, {"issue.start_development", "Start issue development"}, {"issue.mark_qa", "Mark issues ready for QA"}, {"issue.mark_released", "Mark issues released"}, {"issue.follow_up", "Perform issue follow-up"}, {"issue.close", "Close issues"}, {"issue.reopen", "Reopen issues"}, {"issue.manage_work_state", "Set issue work state"}, {"issue.escalate", "Escalate issues"},
	{"feature_request.read", "View feature requests"}, {"feature_request.create", "Create feature requests"}, {"feature_request.update", "Update feature requests"}, {"feature_request.review", "Review feature requests"}, {"feature_request.prioritize", "Prioritize feature requests"}, {"feature_request.merge", "Merge feature requests"}, {"feature_request.close", "Close feature requests"},
	{"release.read", "View releases"}, {"release.create", "Create releases"}, {"release.update", "Update releases"}, {"release.publish", "Publish releases"}, {"release.manage_impact", "Manage release impact"},
	{"documentation.read", "View documentation"}, {"documentation.create", "Create documentation"}, {"documentation.update", "Update documentation"}, {"documentation.review", "Review documentation"}, {"documentation.publish", "Publish documentation"}, {"documentation.archive", "Archive documentation"},
	{"client_health.read", "View client health"}, {"client_health.manage", "Manage client health"}, {"client_followup.create", "Create client follow-ups"}, {"client_followup.complete", "Complete client follow-ups"},
	{"user.manage", "Manage users"}, {"role.manage", "Manage roles"}, {"permission.manage", "Manage permissions"}, {"audit.read", "View audit records"}, {"system.manage", "Manage system configuration"},
}

func main() {
	databaseURL := required("DATABASE_URL")
	email := required("ADMIN_EMAIL")
	password := required("ADMIN_PASSWORD")
	if len(password) < 8 {
		log.Fatal("ADMIN_PASSWORD must be at least 8 characters")
	}
	name := value("ADMIN_NAME", "System Administrator")
	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatal(err)
	}
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Transaction(func(tx *gorm.DB) error {
		for _, role := range roles {
			if err := tx.Exec(`INSERT INTO roles (name, description) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`, role.name, role.description).Error; err != nil {
				return err
			}
		}
		for _, permission := range permissions {
			if err := tx.Exec(`INSERT INTO permissions (code, description) VALUES (?, ?) ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description`, permission.name, permission.description).Error; err != nil {
				return err
			}
		}
		if err := tx.Exec(`INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, is_active = true, updated_at = NOW()`, email, hash, name).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN' ON CONFLICT DO NOTHING`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u CROSS JOIN roles r WHERE u.email = ? AND r.name = 'SUPER_ADMIN' ON CONFLICT DO NOTHING`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO clients (code, name, slug, type, status, province, city, subscription_start, subscription_end) VALUES
			('SMA-NUSANTARA', 'SMA Nusantara', 'sma-nusantara', 'SENIOR_HIGH', 'ACTIVE', 'DKI Jakarta', 'Jakarta Selatan', CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year'),
			('SMK-MANDIRI', 'SMK Mandiri', 'smk-mandiri', 'VOCATIONAL', 'ACTIVE', 'Jawa Barat', 'Bandung', CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE + INTERVAL '16 months'),
			('SMP-HARAPAN', 'SMP Harapan', 'smp-harapan', 'JUNIOR_HIGH', 'ONBOARDING', 'Banten', 'Tangerang Selatan', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years')
			ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO client_owners (client_id, user_id, owner_type)
			SELECT c.id, u.id, 'PRIMARY' FROM clients c CROSS JOIN users u WHERE c.code IN ('SMA-NUSANTARA', 'SMK-MANDIRI') AND u.email = ?
			ON CONFLICT DO NOTHING`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO client_contacts (client_id, name, position, email, phone, is_primary)
			SELECT c.id, 'Ibu Rina', 'School Operations', 'rina@nusantara.sch.id', '+62 812 0000 1001', true FROM clients c WHERE c.code = 'SMA-NUSANTARA'
			AND NOT EXISTS (SELECT 1 FROM client_contacts cc WHERE cc.client_id = c.id AND cc.email = 'rina@nusantara.sch.id')`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO releases (version, title, summary, status, release_date, created_by, published_by)
			SELECT '2026.08.1', 'Attendance export improvements', 'Reliable attendance export for school operations.', 'PUBLISHED', NOW() - INTERVAL '3 days', u.id, u.id FROM users u WHERE u.email = ?
			ON CONFLICT (version) DO UPDATE SET status = EXCLUDED.status, published_by = EXCLUDED.published_by, release_date = EXCLUDED.release_date, updated_at = NOW()`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO issues (client_id, title, description, category, severity, status, reporter_id, assignee_id, reported_at)
			SELECT c.id, 'Attendance export is missing class filters', 'Operations cannot export attendance by class for the monthly report.', 'Reporting', 'HIGH', 'QA', u.id, u.id, NOW() - INTERVAL '2 days' FROM clients c CROSS JOIN users u WHERE c.code = 'SMA-NUSANTARA' AND u.email = ?
			AND NOT EXISTS (SELECT 1 FROM issues i WHERE i.client_id = c.id AND i.title = 'Attendance export is missing class filters')`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO issues (client_id, title, description, category, severity, status, reporter_id, assignee_id, release_id, reported_at, resolved_at)
			SELECT c.id, 'Guardian login receives an unclear error', 'Guardian login failure now provides actionable guidance.', 'Authentication', 'MEDIUM', 'RELEASED', u.id, u.id, r.id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days' FROM clients c CROSS JOIN users u CROSS JOIN releases r WHERE c.code = 'SMK-MANDIRI' AND u.email = ? AND r.version = '2026.08.1'
			AND NOT EXISTS (SELECT 1 FROM issues i WHERE i.client_id = c.id AND i.title = 'Guardian login receives an unclear error')`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO release_impacts (release_id, client_id, impact_type, requires_follow_up)
			SELECT r.id, c.id, 'DIRECT', true FROM releases r CROSS JOIN clients c WHERE r.version = '2026.08.1' AND c.code = 'SMK-MANDIRI'
			ON CONFLICT (release_id, client_id) DO UPDATE SET requires_follow_up = EXCLUDED.requires_follow_up`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO operational_handoffs (release_id, client_id, ops_owner_id, status, requires_follow_up, acknowledged_at, acknowledged_by)
			SELECT r.id, c.id, u.id, 'FOLLOW_UP_REQUIRED', true, NOW() - INTERVAL '2 days', u.id FROM releases r CROSS JOIN clients c CROSS JOIN users u WHERE r.version = '2026.08.1' AND c.code = 'SMK-MANDIRI' AND u.email = ?
			ON CONFLICT (release_id, client_id) DO UPDATE SET status = EXCLUDED.status, requires_follow_up = EXCLUDED.requires_follow_up`, email).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO client_follow_ups (client_id, handoff_id, owner_id, type, reason, status, due_at)
			SELECT c.id, h.id, u.id, 'RELEASE_UPDATE', 'Confirm the guardian login improvement with the school.', 'OPEN', NOW() + INTERVAL '2 days' FROM clients c CROSS JOIN users u JOIN operational_handoffs h ON h.client_id = c.id WHERE c.code = 'SMK-MANDIRI' AND u.email = ?
			AND NOT EXISTS (SELECT 1 FROM client_follow_ups f WHERE f.handoff_id = h.id AND f.reason = 'Confirm the guardian login improvement with the school.')`, email).Error; err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO feature_requests (title, problem_statement, expected_outcome, status, priority, product_owner_id)
			SELECT 'Attendance export by class', 'Schools need a class-level attendance export.', 'Operations can download attendance per class.', 'PLANNED', 'HIGH', u.id FROM users u WHERE u.email = ?
			AND NOT EXISTS (SELECT 1 FROM feature_requests fr WHERE fr.title = 'Attendance export by class')`, email).Error
	}); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Seed completed")
}

func required(key string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		log.Fatalf("%s is required", key)
	}
	return value
}

func value(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
