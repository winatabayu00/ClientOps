package notifications

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }

func (h *Handler) List(c *gin.Context) {
	page, limit := positive(c.Query("page"), 1), positive(c.Query("limit"), 20)
	if limit > 100 {
		limit = 100
	}
	if read := c.Query("read"); read != "" && read != "true" && read != "false" {
		api.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	out, total, err := h.service.List(auth.CurrentUser(c).ID, c.Query("read"), page, limit)
	if err != nil {
		api.Error(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out, "message": "Success", "meta": gin.H{"page": page, "limit": limit, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(limit)))}})
}

func (h *Handler) UnreadCount(c *gin.Context) {
	count, err := h.service.UnreadCount(auth.CurrentUser(c).ID)
	if err != nil {
		api.Error(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
		return
	}
	api.Success(c, http.StatusOK, gin.H{"count": count}, "Success")
}

func (h *Handler) MarkRead(c *gin.Context) {
	updated, err := h.service.MarkRead(c.Param("id"), auth.CurrentUser(c).ID)
	if err != nil {
		api.Error(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
		return
	}
	if !updated {
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Notification not found", nil)
		return
	}
	api.Success(c, http.StatusOK, nil, "Notification marked read")
}

func (h *Handler) MarkAllRead(c *gin.Context) {
	if err := h.service.MarkAllRead(auth.CurrentUser(c).ID); err != nil {
		api.Error(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
		return
	}
	api.Success(c, http.StatusOK, nil, "Notifications marked read")
}

func positive(raw string, fallback int) int {
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return fallback
	}
	return n
}
