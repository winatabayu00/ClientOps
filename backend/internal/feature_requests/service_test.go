package feature_requests

import "testing"

func TestTransitions(t *testing.T) {
	valid := [][2]string{{"SUBMITTED", "UNDER_REVIEW"}, {"UNDER_REVIEW", "ACCEPTED"}, {"UNDER_REVIEW", "REJECTED"}, {"UNDER_REVIEW", "DUPLICATE"}, {"ACCEPTED", "PLANNED"}, {"PLANNED", "IN_DEVELOPMENT"}, {"IN_DEVELOPMENT", "RELEASED"}, {"RELEASED", "DELIVERED"}}
	for _, v := range valid {
		if !allowed(v[0], v[1]) {
			t.Fatalf("%s to %s rejected", v[0], v[1])
		}
	}
	for _, v := range [][2]string{{"SUBMITTED", "DELIVERED"}, {"ACCEPTED", "REJECTED"}, {"DELIVERED", "UNDER_REVIEW"}} {
		if allowed(v[0], v[1]) {
			t.Fatalf("%s to %s accepted", v[0], v[1])
		}
	}
}
