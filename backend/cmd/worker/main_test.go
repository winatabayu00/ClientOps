package main

import (
	"strings"
	"testing"
)

func TestScheduledJobSQLIsIdempotent(t *testing.T) {
	for _, query := range []string{followUpOverdueSQL, slaApproachingSQL} {
		if !strings.Contains(query, "ON CONFLICT DO NOTHING") {
			t.Fatal("scheduled notification must be idempotent")
		}
	}
}
