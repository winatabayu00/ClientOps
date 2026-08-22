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
	{"issue.read", "View issues"}, {"issue.create", "Create issues"}, {"issue.update", "Update issues"}, {"issue.assign", "Assign issues"}, {"issue.triage", "Triage issues"}, {"issue.investigate", "Investigate issues"}, {"issue.start_development", "Start issue development"}, {"issue.mark_qa", "Mark issues ready for QA"}, {"issue.mark_released", "Mark issues released"}, {"issue.follow_up", "Perform issue follow-up"}, {"issue.close", "Close issues"}, {"issue.reopen", "Reopen issues"}, {"issue.escalate", "Escalate issues"},
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
		if err := tx.Exec(`INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = NOW()`, email, hash, name).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN' ON CONFLICT DO NOTHING`).Error; err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u CROSS JOIN roles r WHERE u.email = ? AND r.name = 'SUPER_ADMIN' ON CONFLICT DO NOTHING`, email).Error
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
