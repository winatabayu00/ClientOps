package releases

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"net/http"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }

type createRequest struct {
	Version string `json:"version"`
	Title   string `json:"title"`
	Summary string `json:"summary"`
}
type itemRequest struct {
	Type        string   `json:"type"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	IssueIDs    []string `json:"issue_ids"`
}
type impactsRequest struct {
	Clients []Impact `json:"clients"`
}

func (h *Handler) List(c *gin.Context) { o, e := h.service.List(); respond(c, o, e, "Success", 200) }
func (h *Handler) Get(c *gin.Context) {
	o, e := h.service.Detail(c.Param("id"))
	respond(c, o, e, "Success", 200)
}
func (h *Handler) Create(c *gin.Context) {
	var i createRequest
	if c.ShouldBindJSON(&i) != nil || i.Version == "" || i.Title == "" || i.Summary == "" {
		invalid(c)
		return
	}
	o, e := h.service.Create(i.Version, i.Title, i.Summary, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, o, e, "Release created", 201)
}
func (h *Handler) AddItem(c *gin.Context) {
	var i itemRequest
	if c.ShouldBindJSON(&i) != nil || !itemType(i.Type) || i.Title == "" || i.Description == "" {
		invalid(c)
		return
	}
	o, e := h.service.AddItem(c.Param("id"), i.Type, i.Title, i.Description, i.IssueIDs, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, o, e, "Release item added", 201)
}
func (h *Handler) Impacts(c *gin.Context) {
	var i impactsRequest
	if c.ShouldBindJSON(&i) != nil {
		invalid(c)
		return
	}
	for _, x := range i.Clients {
		if x.ClientID == "" || !impactType(x.ImpactType) {
			invalid(c)
			return
		}
	}
	e := h.service.SetImpacts(c.Param("id"), i.Clients, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, nil, e, "Release impacts updated", 200)
}
func (h *Handler) Ready(c *gin.Context) {
	o, e := h.service.Ready(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, o, e, "Release ready", 200)
}
func (h *Handler) Publish(c *gin.Context) {
	n, e := h.service.Publish(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, gin.H{"release_id": c.Param("id"), "handoffs_created": n}, e, "Release published", 200)
}
func itemType(s string) bool {
	return s == "FEATURE" || s == "BUG_FIX" || s == "IMPROVEMENT" || s == "SECURITY"
}
func impactType(s string) bool { return s == "DIRECT" || s == "GENERAL" || s == "OPTIONAL" }
func invalid(c *gin.Context)   { api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil) }
func respond(c *gin.Context, data interface{}, err error, message string, status int) {
	if err == nil {
		api.Success(c, status, data, message)
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Release not found", nil)
	case errors.Is(err, ErrInvalidState):
		api.Error(c, 409, "INVALID_STATUS_TRANSITION", "Release cannot make this transition", nil)
	case errors.Is(err, ErrItemsRequired):
		api.Error(c, 409, "RESOURCE_CONFLICT", "Release requires at least one item", nil)
	case errors.Is(err, ErrOwnerRequired):
		api.Error(c, 409, "CLIENT_OWNER_REQUIRED", "Affected client requires an owner", nil)
	default:
		api.Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
	}
}
