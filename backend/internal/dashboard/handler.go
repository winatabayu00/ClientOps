package dashboard

import (
	"fmt"
	"math"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
)

type Handler struct{ service *Service }

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func opsScoped(c *gin.Context) bool {
	for _, role := range auth.CurrentUser(c).Roles {
		if role == "OPS_STAFF" {
			return true
		}
	}
	return false
}

func (h *Handler) Overview(c *gin.Context) {
	out, err := h.service.Overview(auth.CurrentUser(c).ID, opsScoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, http.StatusOK, out, "Success")
}

func (h *Handler) Timeline(c *gin.Context) {
	if !uuidPattern.MatchString(c.Param("id")) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	page, limit := pagination(c)
	in := TimelineInput{Page: page, Limit: limit, Type: c.Query("type")}
	if in.Type != "" && !validTimelineType(in.Type) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	var err error
	if in.From, err = timestamp(c.Query("from")); err != nil {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if in.To, err = timestamp(c.Query("to")); err != nil || (in.From != nil && in.To != nil && in.From.After(*in.To)) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	events, total, err := h.service.Timeline(c.Param("id"), auth.CurrentUser(c).ID, opsScoped(c), in)
	if err == ErrNotFound {
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Client not found", nil)
		return
	}
	if err != nil {
		api.InternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": events, "message": "Success", "meta": gin.H{"page": page, "limit": limit, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(limit)))}})
}

func pagination(c *gin.Context) (int, int) {
	return queryInt(c, "page", 1, 1, 100000), queryInt(c, "limit", 20, 1, 100)
}
func queryInt(c *gin.Context, key string, fallback, min, max int) int {
	var n int
	if _, err := fmt.Sscan(c.DefaultQuery(key, fmt.Sprint(fallback)), &n); err != nil || n < min || n > max {
		return fallback
	}
	return n
}
func timestamp(v string) (*time.Time, error) {
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, v)
	return &t, err
}
func validTimelineType(v string) bool {
	_, ok := map[string]bool{"ISSUE_REPORTED": true, "ISSUE_STATUS_CHANGED": true, "RELEASE_IMPACT_IDENTIFIED": true, "HANDOFF_CREATED": true, "HANDOFF_ACKNOWLEDGED": true, "HANDOFF_COMPLETED": true, "FOLLOW_UP_CREATED": true, "FOLLOW_UP_COMPLETED": true}[v]
	return ok
}
