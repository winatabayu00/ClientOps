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
