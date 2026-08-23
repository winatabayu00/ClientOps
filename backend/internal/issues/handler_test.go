package issues

import (
	"encoding/json"
	"testing"
)

func TestCreateRequestBindsClientID(t *testing.T) {
	var in createRequest
	if err := json.Unmarshal([]byte(`{"client_id":"d0f3b8d2-0f68-4e65-a799-973cf4e8f8c4","title":"Login failure","description":"Details"}`), &in); err != nil {
		t.Fatal(err)
	}
	if in.ClientID == "" {
		t.Fatal("client_id was not bound")
	}
}
