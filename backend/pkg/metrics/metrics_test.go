package metrics

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerExposesPrometheusCounter(t *testing.T) {
	Record(200)
	r := httptest.NewRecorder()
	Handler(r, httptest.NewRequest("GET", "/metrics", nil))
	if !strings.Contains(r.Body.String(), "clientops_http_requests_total") {
		t.Fatal("missing request counter")
	}
}
