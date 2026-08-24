package operations

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"net/http"
	"time"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }

type followUpRequest struct {
	ClientID  string    `json:"client_id"`
	HandoffID *string   `json:"handoff_id"`
	OwnerID   string    `json:"owner_id"`
	Type      string    `json:"type"`
	Reason    string    `json:"reason"`
	DueAt     time.Time `json:"due_at"`
}
type completeRequest struct {
	Result string `json:"result"`
}

func (h *Handler) ListHandoffs(c *gin.Context) {
	owner := c.Query("ops_owner_id")
	if !manager(c) {
		owner = auth.CurrentUser(c).ID
	}
	o, e := h.service.Handoffs(c.Query("client_id"), c.Query("release_id"), owner, c.Query("status"))
	respond(c, o, e, "Success", 200)
}
func (h *Handler) GetHandoff(c *gin.Context) {
	o, e := h.service.GetHandoff(c.Param("id"))
	if e == nil && !manager(c) && o.OpsOwnerID != auth.CurrentUser(c).ID {
		e = ErrAccess
	}
	respond(c, o, e, "Success", 200)
}
func (h *Handler) Acknowledge(c *gin.Context) {
	o, e := h.service.Acknowledge(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c), manager(c))
	respond(c, o, e, "Handoff acknowledged", 200)
}
func (h *Handler) CompleteHandoff(c *gin.Context) {
	o, e := h.service.CompleteHandoff(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c), manager(c))
	respond(c, o, e, "Handoff completed", 200)
}
func (h *Handler) ListFollowUps(c *gin.Context) {
	owner := c.Query("owner_id")
	if !manager(c) {
		owner = auth.CurrentUser(c).ID
	}
	o, e := h.service.FollowUps(c.Query("client_id"), owner, c.Query("status"))
	respond(c, o, e, "Success", 200)
}
func (h *Handler) CreateFollowUp(c *gin.Context) {
	var i followUpRequest
	if c.ShouldBindJSON(&i) != nil || i.ClientID == "" || i.OwnerID == "" || i.Reason == "" || i.DueAt.IsZero() || !followType(i.Type) {
		invalid(c)
		return
	}
	o, e := h.service.CreateFollowUp(FollowUp{ClientID: i.ClientID, HandoffID: i.HandoffID, OwnerID: i.OwnerID, Type: i.Type, Reason: i.Reason, DueAt: i.DueAt}, auth.CurrentUser(c).ID, api.RequestID(c), manager(c))
	respond(c, o, e, "Follow-up created", 201)
}
func (h *Handler) StartFollowUp(c *gin.Context) {
	o, e := h.service.StartFollowUp(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c), manager(c))
	respond(c, o, e, "Follow-up started", 200)
}
func (h *Handler) CompleteFollowUp(c *gin.Context) {
	var i completeRequest
	if c.ShouldBindJSON(&i) != nil || i.Result == "" {
		invalid(c)
		return
	}
	o, e := h.service.CompleteFollowUp(c.Param("id"), i.Result, auth.CurrentUser(c).ID, api.RequestID(c), manager(c))
	respond(c, o, e, "Follow-up completed", 200)
}
func manager(c *gin.Context) bool {
	return auth.HasRole(c, "SUPER_ADMIN", "OPS_MANAGER")
}
func followType(s string) bool {
	for _, v := range []string{"ISSUE_RESOLUTION", "RELEASE_UPDATE", "TRAINING", "RELATIONSHIP_CHECK", "OTHER"} {
		if s == v {
			return true
		}
	}
	return false
}
func invalid(c *gin.Context) { api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil) }
func respond(c *gin.Context, data interface{}, err error, message string, status int) {
	if err == nil {
		api.Success(c, status, data, message)
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Resource not found", nil)
	case errors.Is(err, ErrAccess):
		api.Error(c, 403, "RESOURCE_ACCESS_DENIED", "Resource access denied", nil)
	case errors.Is(err, ErrDocumentation):
		api.Error(c, 409, "DOCUMENTATION_REQUIRED", "Published release documentation is required", nil)
	case errors.Is(err, ErrFollowUp):
		api.Error(c, 409, "FOLLOW_UP_NOT_COMPLETED", "Required follow-up is incomplete", nil)
	case errors.Is(err, ErrState):
		api.Error(c, 409, "INVALID_STATUS_TRANSITION", "Resource cannot make this transition", nil)
	default:
		api.Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
	}
}
