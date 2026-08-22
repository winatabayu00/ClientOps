package docs

import "testing"

func TestArchivedDocumentCannotTransition(t *testing.T) {
	if !terminal("ARCHIVED") {
		t.Fatal("archived documentation must be terminal")
	}
	if terminal("PUBLISHED") {
		t.Fatal("published documentation must remain linkable")
	}
}
