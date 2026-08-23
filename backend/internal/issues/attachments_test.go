package issues

import (
	"strings"
	"testing"
)

func TestAttachmentValidation(t *testing.T) {
	if !validAttachment("application/pdf", maxAttachmentBytes) {
		t.Fatal("expected PDF at size limit to pass")
	}
	if validAttachment("application/octet-stream", 1) {
		t.Fatal("unexpected MIME accepted")
	}
	if validAttachment("image/png", maxAttachmentBytes+1) {
		t.Fatal("oversized attachment accepted")
	}
}

func TestAttachmentKey(t *testing.T) {
	key := attachmentKey("f6d62d97-8c1b-45d6-9ee4-91d487da9793")
	if !strings.HasPrefix(key, "issues/f6d62d97-8c1b-45d6-9ee4-91d487da9793/") || strings.Contains(key, "..") {
		t.Fatalf("unsafe key: %s", key)
	}
}
