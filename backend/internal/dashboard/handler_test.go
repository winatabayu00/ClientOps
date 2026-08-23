package dashboard

import (
	"strings"
	"testing"
)

func TestSLABreachedSQLUsesActivePolicy(t *testing.T) {
	if !strings.Contains(slaBreachedSQL(), "sp.is_active") {
		t.Fatal("SLA breach query must use active policies")
	}
}

func TestTimelineTypeValidation(t *testing.T) {
	if !validTimelineType("HANDOFF_COMPLETED") || validTimelineType("INVENTED") {
		t.Fatal("timeline type validation mismatch")
	}
}

func TestTimestampValidation(t *testing.T) {
	if _, err := timestamp("2026-08-23T10:00:00Z"); err != nil {
		t.Fatal(err)
	}
	if _, err := timestamp("not-a-time"); err == nil {
		t.Fatal("invalid timestamp accepted")
	}
}
