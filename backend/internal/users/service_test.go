package users

import (
	"errors"
	"testing"
)

func TestSetUserRolesRejectsSelfLockout(t *testing.T) {
	if err := (&Service{}).SetUserRoles("user-id", nil, "user-id", "request-id"); !errors.Is(err, ErrSelfLockout) {
		t.Fatalf("error = %v, want ErrSelfLockout", err)
	}
}
