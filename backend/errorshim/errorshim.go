// Package errorshim reports application panics to the AI Engineering OS
// error tracker. Zero-dependency, never throws, non-blocking.
// ponytail: URL/key are pinned to the local tracker install; when the API
// moves off localhost, move them to env wiring instead of editing constants.
package errorshim

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

// One-time connection details for the AI Engineering OS error tracker.
const (
	captureURL = "http://localhost:4000/api/projects/204c25bc-44d0-4595-9c9f-c14a7934b4ce/errors/capture"
	ingestKey  = "fa38d573-b710-4da5-85c3-99424e302d68"
)

func send(message, stack string) {
	body, _ := json.Marshal(map[string]string{"message": message, "stack": stack, "severity": "medium", "source": "agent"})
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Post(captureURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}

// Recovery is a gin middleware that reports panics to the error tracker and
// returns a 500. Never blocks or re-panics.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				send(fmt.Sprint(r), string(debug.Stack()))
				c.AbortWithStatus(http.StatusInternalServerError)
			}
		}()
		c.Next()
	}
}