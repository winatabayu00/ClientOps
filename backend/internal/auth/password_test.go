package auth

import "testing"

func TestHashPasswordUsesLoginPHCFormat(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	if !verifyPassword(hash, "correct horse battery staple") {
		t.Fatal("generated hash was not accepted by login verification")
	}
	if verifyPassword(hash, "wrong password") {
		t.Fatal("generated hash accepted a wrong password")
	}
}
