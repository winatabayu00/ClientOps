package metrics

import (
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
)

var requests atomic.Uint64
var mu sync.Mutex
var statuses = map[int]uint64{}

func Record(status int) { requests.Add(1); mu.Lock(); statuses[status]++; mu.Unlock() }

func Handler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	fmt.Fprintf(w, "# TYPE clientops_http_requests_total counter\nclientops_http_requests_total %d\n", requests.Load())
	mu.Lock()
	defer mu.Unlock()
	for status, count := range statuses {
		fmt.Fprintf(w, "clientops_http_responses_total{status=\"%d\"} %d\n", status, count)
	}
}
