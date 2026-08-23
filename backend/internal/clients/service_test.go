package clients

import (
	"encoding/json"
	"testing"
)

func TestCreateInputBindsPrimaryOwnerID(t *testing.T) {
	var in CreateInput
	if err := json.Unmarshal([]byte(`{"primary_owner_id":"d0f3b8d2-0f68-4e65-a799-973cf4e8f8c4"}`), &in); err != nil {
		t.Fatal(err)
	}
	if in.PrimaryOwnerID == nil {
		t.Fatal("primary_owner_id was not bound")
	}
}
