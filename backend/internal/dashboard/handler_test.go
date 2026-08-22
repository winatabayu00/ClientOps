package dashboard

import "testing"

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
