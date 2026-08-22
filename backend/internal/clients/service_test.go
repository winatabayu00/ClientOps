package clients

import "testing"

func TestSlug(t *testing.T) {
	if got := slug("SMA Nusantara #1"); got != "sma-nusantara-1" {
		t.Fatalf("slug() = %q", got)
	}
}
