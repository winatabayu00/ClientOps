package operations

import (
	"errors"
	"testing"
)

func TestCanCompleteHandoff(t *testing.T) {
	for _, tc := range []struct {
		name            string
		status          string
		follow          bool
		docs, completed int64
		want            error
	}{
		{"requires acknowledgement", "PENDING", false, 1, 0, ErrState},
		{"requires published documentation", "ACKNOWLEDGED", false, 0, 0, ErrDocumentation},
		{"blocks incomplete required follow-up", "FOLLOW_UP_REQUIRED", true, 1, 0, ErrState},
		{"requires completed follow-up", "ACKNOWLEDGED", true, 1, 0, ErrFollowUp},
		{"completes acknowledged handoff", "ACKNOWLEDGED", false, 1, 0, nil},
		{"completes followed-up handoff", "FOLLOWED_UP", true, 1, 1, nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := canCompleteHandoff(tc.status, tc.follow, tc.docs, tc.completed); !errors.Is(got, tc.want) {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}
