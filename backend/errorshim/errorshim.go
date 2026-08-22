// Package errorshim recovers panics without exposing internals to API clients.
package errorshim

import (
	"log"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
)

// Recovery logs diagnostic context server-side and returns a sanitized error.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("panic request_id=%s method=%s path=%s panic=%v stack=%s", api.RequestID(c), c.Request.Method, c.Request.URL.Path, r, debug.Stack())
				api.InternalError(c)
			}
		}()
		c.Next()
	}
}
