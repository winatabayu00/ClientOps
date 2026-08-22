package users

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{s} }

var uuid = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func validIDs(ids []string) bool {
	for _, id := range ids {
		if !uuid.MatchString(id) {
			return false
		}
	}
	return true
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
func (h *Handler) ListUsers(c *gin.Context) {
	p, l := page(c)
	status := c.Query("status")
	if status != "" && status != "ACTIVE" && status != "INACTIVE" {
		validation(c)
		return
	}
	role := c.Query("role")
	if role != "" && !uuid.MatchString(role) {
		validation(c)
		return
	}
	out, total, err := h.service.ListUsers(c.Query("search"), status, role, p, l)
	if err != nil {
		internal(c)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": out, "message": "Success", "meta": gin.H{"page": p, "limit": l, "total": total, "total_pages": int(math.Ceil(float64(total) / float64(l)))}})
}
func (h *Handler) CreateUser(c *gin.Context) {
	var in struct {
		Name     string   `json:"name"`
		Email    string   `json:"email"`
		Password string   `json:"password"`
		RoleIDs  []string `json:"role_ids"`
	}
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.Name) == "" || len(in.Name) > 255 || !validEmail(in.Email) || len(in.Password) < 12 || !validIDs(in.RoleIDs) || len(in.RoleIDs) == 0 {
		validation(c)
		return
	}
	u, err := h.service.CreateUser(strings.TrimSpace(in.Name), in.Email, in.Password, in.RoleIDs, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 201, u, "User created")
}
func (h *Handler) GetUser(c *gin.Context) {
	if !uuid.MatchString(c.Param("id")) {
		validation(c)
		return
	}
	u, err := h.service.GetUser(c.Param("id"))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 200, u, "Success")
}
func (h *Handler) UpdateUser(c *gin.Context) {
	var in struct {
		Name   string `json:"name"`
		Status string `json:"status"`
	}
	if !uuid.MatchString(c.Param("id")) || c.ShouldBindJSON(&in) != nil || (in.Name == "" && in.Status == "") || (in.Name != "" && len(strings.TrimSpace(in.Name)) > 255) || (in.Status != "" && in.Status != "ACTIVE" && in.Status != "INACTIVE") {
		validation(c)
		return
	}
	u, err := h.service.UpdateUser(c.Param("id"), strings.TrimSpace(in.Name), in.Status, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 200, u, "User updated")
}
func (h *Handler) SetRoles(c *gin.Context) {
	var in struct {
		RoleIDs []string `json:"role_ids"`
	}
	if !uuid.MatchString(c.Param("id")) || c.ShouldBindJSON(&in) != nil || len(in.RoleIDs) == 0 || !validIDs(in.RoleIDs) {
		validation(c)
		return
	}
	if err := h.service.SetUserRoles(c.Param("id"), in.RoleIDs, auth.CurrentUser(c).ID, api.RequestID(c)); err != nil {
		write(c, err)
		return
	}
	api.Success(c, 200, nil, "User roles updated")
}
func (h *Handler) ListRoles(c *gin.Context) {
	out, err := h.service.ListRoles()
	if err != nil {
		internal(c)
		return
	}
	api.Success(c, 200, out, "Success")
}
func (h *Handler) GetRole(c *gin.Context) {
	if !uuid.MatchString(c.Param("id")) {
		validation(c)
		return
	}
	out, err := h.service.GetRole(c.Param("id"))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 200, out, "Success")
}
func (h *Handler) CreateRole(c *gin.Context) {
	var in struct {
		Name          string   `json:"name"`
		Description   *string  `json:"description"`
		PermissionIDs []string `json:"permission_ids"`
	}
	if c.ShouldBindJSON(&in) != nil || !validRoleName(in.Name) || !validIDs(in.PermissionIDs) {
		validation(c)
		return
	}
	out, err := h.service.CreateRole(in.Name, in.Description, in.PermissionIDs, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 201, out, "Role created")
}
func (h *Handler) UpdateRole(c *gin.Context) {
	var in struct {
		Name          string   `json:"name"`
		Description   *string  `json:"description"`
		PermissionIDs []string `json:"permission_ids"`
	}
	if !uuid.MatchString(c.Param("id")) || c.ShouldBindJSON(&in) != nil || !validRoleNameOptional(in.Name) || in.PermissionIDs != nil && !validIDs(in.PermissionIDs) {
		validation(c)
		return
	}
	out, err := h.service.UpdateRole(c.Param("id"), in.Name, in.Description, in.PermissionIDs, auth.CurrentUser(c).ID, api.RequestID(c))
	if err != nil {
		write(c, err)
		return
	}
	api.Success(c, 200, out, "Role updated")
}
func (h *Handler) DeleteRole(c *gin.Context) {
	if !uuid.MatchString(c.Param("id")) {
		validation(c)
		return
	}
	if err := h.service.DeleteRole(c.Param("id"), auth.CurrentUser(c).ID, api.RequestID(c)); err != nil {
		write(c, err)
		return
	}
	c.Status(204)
}
func (h *Handler) Permissions(c *gin.Context) {
	out, err := h.service.Permissions()
	if err != nil {
		internal(c)
		return
	}
	api.Success(c, 200, out, "Success")
}
func validRoleName(s string) bool         { return regexp.MustCompile(`^[A-Z][A-Z0-9_]{1,99}$`).MatchString(s) }
func validRoleNameOptional(s string) bool { return s == "" || validRoleName(s) }
func validEmail(s string) bool {
	return regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`).MatchString(s)
}
func validation(c *gin.Context) { api.Error(c, 422, "VALIDATION_ERROR", "Validation failed", nil) }
func internal(c *gin.Context)   { api.InternalError(c) }
func write(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		api.Error(c, 404, "RESOURCE_NOT_FOUND", "Resource not found", nil)
	case errors.Is(err, ErrSelfLockout):
		api.Error(c, 409, "RESOURCE_CONFLICT", "You cannot remove your own access", nil)
	case errors.Is(err, ErrConflict):
		api.Error(c, 409, "RESOURCE_CONFLICT", "Request conflicts with existing data", nil)
	default:
		api.Error(c, http.StatusConflict, "RESOURCE_CONFLICT", "Request conflicts with existing data", nil)
	}
}
