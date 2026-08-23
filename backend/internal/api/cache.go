package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/pkg/cache"
)

func DashboardCacheInvalidation(caches *cache.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if c.Request.Method != http.MethodGet && c.Writer.Status() < 400 {
			caches.InvalidateDashboard()
		}
	}
}
