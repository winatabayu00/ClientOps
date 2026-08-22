package notifications

import "testing"

func TestPositive(t *testing.T) {
	for _, tc := range []struct {
		raw  string
		want int
	}{{"3", 3}, {"0", 1}, {"bad", 1}} {
		if got := positive(tc.raw, 1); got != tc.want {
			t.Fatalf("positive(%q) = %d, want %d", tc.raw, got, tc.want)
		}
	}
}
