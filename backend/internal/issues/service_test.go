package issues

import "testing"

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
