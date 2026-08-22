package issues

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

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

type createRequest struct {
	ClientID, Title, Description string
	Category, Severity           *string
}
type updateRequest struct {
	Title, Description, Category, Severity *string
	Version                                int
}
type actionRequest struct {
	Version                                                              int
	Reason, AssigneeID, ReleaseID, ResolutionSummary, Category, Severity *string
}

func (h *Handler) List(c *gin.Context) {
	page, limit := pagination(c)
	user := auth.CurrentUser(c)
	out, total, err := h.service.List(ListInput{Page: page, Limit: limit, Search: c.Query("search"), ClientID: c.Query("client_id"), Status: c.Query("status"), Severity: c.Query("severity"), Category: c.Query("category"), AssigneeID: c.Query("assignee_id"), ReporterID: c.Query("reporter_id"), Sort: c.Query("sort"), Order: c.Query("order")}, user.ID, scoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": out, "message": "Success", "meta": gin.H{"page": page, "limit": limit, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(limit)))}})
}
func (h *Handler) Create(c *gin.Context) {
	var in createRequest
	if c.ShouldBindJSON(&in) != nil || !validUUID(in.ClientID) || in.Title == "" || in.Description == "" || (in.Severity != nil && !validSeverity(*in.Severity)) {
		invalid(c)
		return
	}
	out, err := h.service.Create(CreateInput{ClientID: in.ClientID, Title: in.Title, Description: in.Description, Category: in.Category, Severity: in.Severity}, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 201, out, "Issue created")
}
func (h *Handler) Get(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		invalid(c)
		return
	}
	out, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c))
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, out, "Success")
}
func (h *Handler) Update(c *gin.Context) {
	var in updateRequest
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Version < 1 || (in.Severity != nil && !validSeverity(*in.Severity)) {
		invalid(c)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	out, err := h.service.Update(c.Param("id"), UpdateInput{Title: in.Title, Description: in.Description, Category: in.Category, Severity: in.Severity, Version: in.Version}, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, out, "Issue updated")
}
func (h *Handler) Assign(c *gin.Context)             { h.action(c, "", "ISSUE_ASSIGNED") }
func (h *Handler) Triage(c *gin.Context)             { h.action(c, "TRIAGED", "") }
func (h *Handler) StartInvestigation(c *gin.Context) { h.action(c, "INVESTIGATING", "") }
func (h *Handler) StartDevelopment(c *gin.Context)   { h.action(c, "IN_DEVELOPMENT", "") }
func (h *Handler) MarkQA(c *gin.Context)             { h.action(c, "QA", "") }
func (h *Handler) QAFailed(c *gin.Context)           { h.action(c, "IN_DEVELOPMENT", "") }
func (h *Handler) MarkReleased(c *gin.Context)       { h.action(c, "RELEASED", "") }
func (h *Handler) StartFollowUp(c *gin.Context)      { h.action(c, "FOLLOW_UP", "") }
func (h *Handler) Close(c *gin.Context)              { h.action(c, "CLOSED", "") }
func (h *Handler) Reopen(c *gin.Context)             { h.action(c, "REOPENED", "") }
func (h *Handler) action(c *gin.Context, to, _ string) {
	var in actionRequest
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Version < 1 || (in.AssigneeID != nil && !validUUID(*in.AssigneeID)) || (in.ReleaseID != nil && !validUUID(*in.ReleaseID)) || (in.Severity != nil && !validSeverity(*in.Severity)) {
		invalid(c)
		return
	}
	if to == "REOPENED" && in.Reason == nil {
		invalid(c)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	data := TransitionInput{Version: in.Version, Reason: in.Reason, AssigneeID: in.AssigneeID, ReleaseID: in.ReleaseID, ResolutionSummary: in.ResolutionSummary, Category: in.Category, Severity: in.Severity}
	var out Issue
	var err error
	if to == "" {
		out, err = h.service.Assign(c.Param("id"), data, auth.CurrentUser(c).ID, api.RequestID(c))
	} else {
		out, err = h.service.Transition(c.Param("id"), to, data, auth.CurrentUser(c).ID, api.RequestID(c))
	}
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, out, "Issue updated")
}
func (h *Handler) History(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		invalid(c)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	out, err := h.service.History(c.Param("id"))
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, 200, out, "Success")
}
func pagination(c *gin.Context) (int, int) {
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
func scoped(c *gin.Context) bool {
	for _, role := range auth.CurrentUser(c).Roles {
		if role == "OPS_STAFF" {
			return true
		}
	}
	return false
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func validUUID(v string) bool { return uuidPattern.MatchString(v) }
func validSeverity(v string) bool {
	return v == "LOW" || v == "MEDIUM" || v == "HIGH" || v == "CRITICAL"
}
func invalid(c *gin.Context) { api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil) }
func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Issue not found", nil)
	case errors.Is(err, ErrVersionConflict):
		api.Error(c, 409, "VERSION_CONFLICT", "Issue has changed", nil)
	case errors.Is(err, ErrInvalidTransition):
		api.Error(c, 409, "INVALID_STATUS_TRANSITION", "Issue cannot make this transition", nil)
	case errors.Is(err, ErrAssigneeRequired):
		api.Error(c, 409, "ISSUE_ASSIGNEE_REQUIRED", "Issue assignee is required", nil)
	case errors.Is(err, ErrReleaseRequired):
		api.Error(c, 409, "RELEASE_REFERENCE_REQUIRED", "Release reference is required", nil)
	case errors.Is(err, ErrOperationalClosure):
		api.Error(c, 409, "FOLLOW_UP_NOT_COMPLETED", "Operational handoff must be completed", nil)
	default:
		api.Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
	}
}
