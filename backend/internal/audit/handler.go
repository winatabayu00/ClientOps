package audit

import (
	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"gorm.io/gorm"
	"math"
	"net/http"
	"strconv"
	"time"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }
func (h *Handler) List(c *gin.Context) {
	from, err := date(c.Query("from"))
	if err != nil {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	to, err := date(c.Query("to"))
	if err != nil {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	page, limit := positive(c.Query("page"), 1), positive(c.Query("limit"), 20)
	if limit > 100 {
		limit = 100
	}
	logs, total, err := h.service.List(Filter{ActorID: c.Query("actor_id"), Action: c.Query("action"), ResourceType: c.Query("resource_type"), ResourceID: c.Query("resource_id"), From: from, To: to}, page, limit)
	if err != nil {
		api.InternalError(c)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": logs, "message": "Success", "meta": gin.H{"page": page, "limit": limit, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(limit)))}})
}
func (h *Handler) Get(c *gin.Context) {
	log, err := h.service.Get(c.Param("id"))
	if err == gorm.ErrRecordNotFound {
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Audit log not found", nil)
		return
	}
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, http.StatusOK, log, "Success")
}
func positive(raw string, fallback int) int {
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return fallback
	}
	return n
}
func date(raw string) (*time.Time, error) {
	if raw == "" {
		return nil, nil
	}
	value, err := time.Parse(time.RFC3339, raw)
	return &value, err
}
