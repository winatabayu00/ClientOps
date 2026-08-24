package feature_requests

import (
	"errors"
	"math"
	"net/http"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }
func scoped(c *gin.Context) bool {
	return auth.HasRole(c, "OPS_STAFF")
}
func (h *Handler) List(c *gin.Context) {
	p, l := page(c)
	user := auth.CurrentUser(c)
	out, total, err := h.service.List(ListInput{Search: c.Query("search"), Status: c.Query("status"), Priority: c.Query("priority"), ClientID: c.Query("client_id"), ProductOwnerID: c.Query("product_owner_id"), Page: p, Limit: l}, user.ID, scoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": out, "message": "Success", "meta": gin.H{"page": p, "limit": l, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(l)))}})
}
func (h *Handler) Get(c *gin.Context) {
	if !uuid(c.Param("id")) {
		invalid(c)
		return
	}
	out, err := h.service.Detail(c.Param("id"), auth.CurrentUser(c).ID, scoped(c))
	respond(c, out, err, "Success", 200)
}
func (h *Handler) Create(c *gin.Context) {
	var in CreateInput
	user := auth.CurrentUser(c)
	if c.ShouldBindJSON(&in) != nil || !uuid(in.ClientID) || in.Title == "" || in.ProblemStatement == "" || in.ExpectedOutcome == "" {
		invalid(c)
		return
	}
	access, err := h.service.ClientAccessible(in.ClientID, user.ID, scoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	if !access {
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Client not found", nil)
		return
	}
	out, err := h.service.Create(in, user.ID, api.RequestID(c))
	respond(c, out, err, "Feature request created", 201)
}
func (h *Handler) AddClient(c *gin.Context) {
	var in AddClientInput
	user := auth.CurrentUser(c)
	if !uuid(c.Param("id")) || c.ShouldBindJSON(&in) != nil || !uuid(in.ClientID) {
		invalid(c)
		return
	}
	if _, err := h.service.Detail(c.Param("id"), user.ID, scoped(c)); err != nil {
		respond(c, nil, err, "", 200)
		return
	}
	access, err := h.service.ClientAccessible(in.ClientID, user.ID, scoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	if !access {
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Client not found", nil)
		return
	}
	err = h.service.AddClient(c.Param("id"), in, user.ID, api.RequestID(c))
	respond(c, nil, err, "Client demand added", 201)
}
func (h *Handler) Action(to string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Version           int    `json:"version"`
			Reason            string `json:"reason"`
			OriginalRequestID string `json:"original_request_id"`
		}
		user := auth.CurrentUser(c)
		if !uuid(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Version < 1 || (to == "DUPLICATE" && !uuid(in.OriginalRequestID)) {
			invalid(c)
			return
		}
		if _, err := h.service.Detail(c.Param("id"), user.ID, scoped(c)); err != nil {
			respond(c, nil, err, "", 200)
			return
		}
		out, err := h.service.Transition(c.Param("id"), to, in.Reason, in.OriginalRequestID, in.Version, user.ID, api.RequestID(c))
		respond(c, out, err, "Feature request updated", 200)
	}
}
func page(c *gin.Context) (int, int) {
	p, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	l, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if p < 1 {
		p = 1
	}
	if l < 1 || l > 100 {
		l = 20
	}
	return p, l
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func uuid(v string) bool     { return uuidPattern.MatchString(v) }
func invalid(c *gin.Context) { api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil) }
func respond(c *gin.Context, data interface{}, err error, message string, status int) {
	if err == nil {
		api.Success(c, status, data, message)
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Feature request not found", nil)
	case errors.Is(err, ErrInvalidState):
		api.Error(c, 409, "INVALID_STATUS_TRANSITION", "Feature request cannot make this transition", nil)
	case errors.Is(err, ErrVersionConflict):
		api.Error(c, 409, "VERSION_CONFLICT", "Feature request has changed", nil)
	case errors.Is(err, ErrClientExists):
		api.Error(c, 409, "RESOURCE_CONFLICT", "Client demand already exists", nil)
	default:
		api.Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
	}
}
