package audit

import "testing"

func TestDate(t *testing.T) {
	if _, err := date("2026-08-23T12:00:00Z"); err != nil {
		t.Fatal(err)
	}
	if _, err := date("not-a-date"); err == nil {
		t.Fatal("invalid date accepted")
	}
}

func TestAuditQueryJoinsActors(t *testing.T) {
	query, _ := auditQuery(Filter{})
	if query != "FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE 1=1" {
		t.Fatalf("audit query missing actor join: %s", query)
	}
}
