package issues

import (
	"testing"
	"time"
)

func TestAllowedTransitions(t *testing.T) {
	for _, tc := range []struct {
		from, to string
		want     bool
	}{{"REPORTED", "TRIAGED", true}, {"QA", "RELEASED", true}, {"REPORTED", "CLOSED", false}, {"TRIAGED", "QA", false}} {
		if got := allowed(tc.from, tc.to); got != tc.want {
			t.Fatalf("%s to %s: got %t", tc.from, tc.to, got)
		}
	}
}

func TestSummarizeWork(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	middle := start.Add(time.Hour)
	states := []WorkState{{State: "ACTIVE", StartedAt: start, EndedAt: &middle}, {State: "WAITING_CLIENT", StartedAt: middle}}
	got := summarizeWork(states, start.Add(3*time.Hour))
	if got.ActiveMinutes != 60 || got.WaitingClientMinutes != 120 || got.ElapsedMinutes != 180 {
		t.Fatalf("unexpected summary: %#v", got)
	}
}
