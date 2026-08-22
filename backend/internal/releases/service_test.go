package releases

import "testing"

func TestReleaseEnums(t *testing.T) {
	for _, v := range []string{"FEATURE", "BUG_FIX", "IMPROVEMENT", "SECURITY"} {
		if !itemType(v) {
			t.Fatalf("item type %q rejected", v)
		}
	}
	for _, v := range []string{"DIRECT", "GENERAL", "OPTIONAL"} {
		if !impactType(v) {
			t.Fatalf("impact type %q rejected", v)
		}
	}
}
