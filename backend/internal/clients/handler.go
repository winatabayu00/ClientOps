package clients

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
func scoped(c *gin.Context) bool {
	for _, role := range auth.CurrentUser(c).Roles {
		if role == "OPS_STAFF" {
			return true
		}
	}
	return false
}
func (h *Handler) List(c *gin.Context) {
	page, limit := page(c)
	user := auth.CurrentUser(c)
	health := c.Query("health")
	if health != "" && health != "HEALTHY" && health != "ATTENTION" && health != "AT_RISK" {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	clients, total, err := h.service.List(ListInput{Page: page, Limit: limit, Search: c.Query("search"), Status: c.Query("status"), Type: c.Query("type"), OwnerID: c.Query("owner_id"), Health: health, Sort: c.Query("sort"), Order: c.Query("order")}, user.ID, scoped(c))
	if err != nil {
		api.InternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": clients, "message": "Success", "meta": gin.H{"page": page, "limit": limit, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(limit)))}})
}
func (h *Handler) Create(c *gin.Context) {
	var in CreateInput
	if c.ShouldBindJSON(&in) != nil || in.Code == "" || in.Name == "" || !validType(in.Type) || (in.Status != "" && !validStatus(in.Status)) || (in.PrimaryOwnerID != nil && !validUUID(*in.PrimaryOwnerID)) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	client, err := h.service.Create(in)
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 201, client, "Client created")
}
func (h *Handler) Get(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	client, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c))
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, client, "Success")
}
func (h *Handler) Health(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	health, err := h.service.Health(c.Param("id"))
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, 200, health, "Success")
}
func (h *Handler) Update(c *gin.Context) {
	var in UpdateInput
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Version < 1 || (in.Type != nil && !validType(*in.Type)) || (in.Status != nil && !validStatus(*in.Status)) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	client, err := h.service.Update(c.Param("id"), in)
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, client, "Client updated")
}
func (h *Handler) Archive(c *gin.Context) {
	var in struct {
		Version int `json:"version"`
	}
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Version < 1 {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	if err := h.service.Archive(c.Param("id"), in.Version); err != nil {
		writeError(c, err)
		return
	}
	c.Status(204)
}
func (h *Handler) Owners(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	owners, err := h.service.Owners(c.Param("id"))
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, 200, owners, "Success")
}
func (h *Handler) AddOwner(c *gin.Context) {
	var in struct {
		UserID    string `json:"user_id"`
		OwnerType string `json:"owner_type"`
	}
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || !validUUID(in.UserID) || (in.OwnerType != "PRIMARY" && in.OwnerType != "SECONDARY" && in.OwnerType != "TECHNICAL") {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	if err := h.service.AddOwner(c.Param("id"), in.UserID, in.OwnerType); err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 201, nil, "Owner assigned")
}
func (h *Handler) ChangePrimaryOwner(c *gin.Context) {
	var in struct {
		NewOwnerID string `json:"new_owner_id"`
	}
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || !validUUID(in.NewOwnerID) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	if err := h.service.ChangePrimaryOwner(c.Param("id"), in.NewOwnerID); err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 200, nil, "Primary owner changed")
}
func (h *Handler) Contacts(c *gin.Context) {
	if !validUUID(c.Param("id")) {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	items, err := h.service.Contacts(c.Param("id"))
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, 200, items, "Success")
}
func (h *Handler) AddContact(c *gin.Context) {
	var in Contact
	if !validUUID(c.Param("id")) || c.ShouldBindJSON(&in) != nil || in.Name == "" {
		api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	if _, err := h.service.Get(c.Param("id"), auth.CurrentUser(c).ID, scoped(c)); err != nil {
		writeError(c, err)
		return
	}
	in.ClientID = c.Param("id")
	out, err := h.service.AddContact(in)
	if err != nil {
		writeError(c, err)
		return
	}
	api.Success(c, 201, out, "Contact created")
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
func validType(v string) bool {
	return v == "ELEMENTARY" || v == "JUNIOR_HIGH" || v == "SENIOR_HIGH" || v == "VOCATIONAL" || v == "OTHER"
}
func validStatus(v string) bool { return v == "ACTIVE" || v == "ONBOARDING" || v == "INACTIVE" }

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func validUUID(v string) bool { return uuidPattern.MatchString(v) }
func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Client not found", nil)
	case errors.Is(err, ErrVersionConflict):
		api.Error(c, 409, "VERSION_CONFLICT", "Client has changed", nil)
	case errors.Is(err, ErrPrimaryExists):
		api.Error(c, 409, "RESOURCE_CONFLICT", "Client already has a primary owner", nil)
	default:
		api.Error(c, 409, "RESOURCE_CONFLICT", "Request conflicts with existing data", nil)
	}
}
