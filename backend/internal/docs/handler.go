package docs

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }

type createRequest struct {
	Title   string `json:"title"`
	Summary string `json:"summary"`
	Content string `json:"content"`
}
type updateRequest struct {
	Title   string `json:"title"`
	Summary string `json:"summary"`
	Content string `json:"content"`
	Version int    `json:"version"`
}
type versionRequest struct {
	Version int `json:"version"`
}
type linkRequest struct {
	ReleaseID        string `json:"release_id"`
	FeatureRequestID string `json:"feature_request_id"`
}

func (h *Handler) List(c *gin.Context) {
	out, err := h.service.List()
	respond(c, out, err, "Success", http.StatusOK)
}
func (h *Handler) Get(c *gin.Context) {
	out, err := h.service.Get(c.Param("id"))
	respond(c, out, err, "Success", http.StatusOK)
}
func (h *Handler) Create(c *gin.Context) {
	var in createRequest
	if c.ShouldBindJSON(&in) != nil || in.Title == "" || in.Summary == "" || in.Content == "" {
		invalid(c)
		return
	}
	out, err := h.service.Create(in.Title, in.Summary, in.Content, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, out, err, "Documentation created", http.StatusCreated)
}
func (h *Handler) Edit(c *gin.Context) {
	var in updateRequest
	if c.ShouldBindJSON(&in) != nil || in.Title == "" || in.Summary == "" || in.Content == "" || in.Version < 1 {
		invalid(c)
		return
	}
	out, err := h.service.Edit(c.Param("id"), in.Title, in.Summary, in.Content, in.Version, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, out, err, "Documentation updated", http.StatusOK)
}
func (h *Handler) Action(action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in versionRequest
		if c.ShouldBindJSON(&in) != nil || in.Version < 1 {
			invalid(c)
			return
		}
		var out Document
		var err error
		actor, request := auth.CurrentUser(c).ID, api.RequestID(c)
		switch action {
		case "review":
			out, err = h.service.SubmitReview(c.Param("id"), in.Version, actor, request)
		case "publish":
			out, err = h.service.Publish(c.Param("id"), in.Version, actor, request)
		case "archive":
			out, err = h.service.Archive(c.Param("id"), in.Version, actor, request)
		}
		respond(c, out, err, "Documentation "+action+"ed", http.StatusOK)
	}
}
func (h *Handler) LinkRelease(c *gin.Context) {
	var in linkRequest
	if c.ShouldBindJSON(&in) != nil || invalidUUID(in.ReleaseID) {
		invalid(c)
		return
	}
	err := h.service.LinkRelease(c.Param("id"), in.ReleaseID, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, nil, err, "Release linked", http.StatusOK)
}
func (h *Handler) LinkFeatureRequest(c *gin.Context) {
	var in linkRequest
	if c.ShouldBindJSON(&in) != nil || invalidUUID(in.FeatureRequestID) {
		invalid(c)
		return
	}
	err := h.service.LinkFeatureRequest(c.Param("id"), in.FeatureRequestID, auth.CurrentUser(c).ID, api.RequestID(c))
	respond(c, nil, err, "Feature request linked", http.StatusOK)
}
func invalidUUID(value string) bool { _, err := uuid.Parse(value); return err != nil }
func invalid(c *gin.Context) {
	api.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Validation failed", nil)
}
func respond(c *gin.Context, data interface{}, err error, message string, status int) {
	if err == nil {
		api.Success(c, status, data, message)
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Documentation not found", nil)
	case errors.Is(err, ErrInvalidState):
		api.Error(c, 409, "INVALID_STATUS_TRANSITION", "Documentation cannot make this transition", nil)
	case errors.Is(err, ErrConflict):
		api.Error(c, 409, "VERSION_CONFLICT", "Documentation has changed", nil)
	default:
		api.Error(c, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
	}
}
