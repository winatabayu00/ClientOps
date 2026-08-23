package clients

import (
	"testing"
	"time"
)

func TestSlug(t *testing.T) {
	if got := slug("SMA Nusantara #1"); got != "sma-nusantara-1" {
		t.Fatalf("slug() = %q", got)
	}
}

func TestCalculateHealthBoundaries(t *testing.T) {
	now := time.Date(2026, 8, 23, 0, 0, 0, 0, time.UTC)
	for _, tc := range []struct {
		name           string
		in             healthInputs
		score          int
		classification string
	}{
		{"healthy", healthInputs{}, 100, "HEALTHY"},
		{"attention boundary", healthInputs{CriticalUnresolved: true, SLABreached: true}, 65, "ATTENTION"},
		{"at risk boundary", healthInputs{CriticalUnresolved: true, SLABreached: true, OverdueFollowUp: true}, 55, "AT_RISK"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := calculateHealth(tc.in, now)
			if got.Score != tc.score || got.Classification != tc.classification || !got.CalculatedAt.Equal(now) {
				t.Fatalf("got %#v", got)
			}
		})
	}
}
