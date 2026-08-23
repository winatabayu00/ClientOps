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

func TestSendMailDisabled(t *testing.T) {
	if err := sendMail("", "ops@example.test", "subject", "body"); err != nil {
		t.Fatal(err)
	}
}

func TestSendMailNoSenderDisabled(t *testing.T) {
	if err := sendMail("smtp://localhost:25", "ops@example.test", "subject", "body"); err != nil {
		t.Fatal(err)
	}
}
