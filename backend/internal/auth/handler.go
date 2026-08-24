package auth

import (
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
)

const userKey = "auth_user"

type Handler struct {
	service *Service
	cfg     config.Config
}

func NewHandler(service *Service, cfg config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

func (h *Handler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Validation failed", nil)
		return
	}
	user, access, refresh, err := h.service.Login(input.Email, input.Password, c.Request.UserAgent(), c.ClientIP())
	if err == ErrInvalidCredentials {
		api.Error(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", nil)
		return
	}
	if err != nil {
		api.InternalError(c)
		return
	}
	h.setTokens(c, access, refresh)
	api.Success(c, http.StatusOK, publicUser(user), "Login successful")
}

func (h *Handler) Refresh(c *gin.Context) {
	refresh, err := c.Cookie(h.cfg.RefreshCookieName)
	if err != nil {
		h.clearTokens(c)
		api.Error(c, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "Session expired", nil)
		return
	}
	access, nextRefresh, err := h.service.Refresh(refresh, c.Request.UserAgent(), c.ClientIP())
	if err == ErrSessionInvalid {
		h.clearTokens(c)
		api.Error(c, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "Session expired", nil)
		return
	}
	if err != nil {
		api.InternalError(c)
		return
	}
	h.setTokens(c, access, nextRefresh)
	api.Success(c, http.StatusOK, nil, "Session refreshed")
}

func (h *Handler) Logout(c *gin.Context) {
	if refresh, err := c.Cookie(h.cfg.RefreshCookieName); err == nil {
		_ = h.service.Logout(refresh)
	}
	h.clearTokens(c)
	c.Status(http.StatusNoContent)
}
func (h *Handler) Me(c *gin.Context) {
	api.Success(c, http.StatusOK, publicUser(CurrentUser(c)), "Success")
}
func (h *Handler) Sessions(c *gin.Context) {
	refresh, _ := c.Cookie(h.cfg.RefreshCookieName)
	sessions, err := h.service.Sessions(CurrentUser(c).ID, refresh)
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, http.StatusOK, sessions, "Success")
}
func (h *Handler) RevokeSession(c *gin.Context) {
	current := CurrentUser(c)
	refresh, _ := c.Cookie(h.cfg.RefreshCookieName)
	sessions, err := h.service.Sessions(current.ID, refresh)
	if err != nil {
		api.InternalError(c)
		return
	}
	isCurrent := false
	for _, session := range sessions {
		if session.ID == c.Param("id") {
			isCurrent = session.Current
		}
	}
	revoked, err := h.service.RevokeSession(current.ID, c.Param("id"))
	if err != nil {
		api.InternalError(c)
		return
	}
	if !revoked {
		api.Error(c, http.StatusNotFound, "RESOURCE_NOT_FOUND", "Session not found", nil)
		return
	}
	if isCurrent {
		h.clearTokens(c)
	}
	c.Status(http.StatusNoContent)
}
func (h *Handler) UserSessions(c *gin.Context) {
	sessions, err := h.service.Sessions(c.Param("id"), "")
	if err != nil {
		api.InternalError(c)
		return
	}
	api.Success(c, http.StatusOK, sessions, "Success")
}
func (h *Handler) RevokeUserSession(c *gin.Context) {
	revoked, err := h.service.RevokeSession(c.Param("id"), c.Param("sessionID"))
	if err != nil {
		api.InternalError(c)
		return
	}
	if !revoked {
		api.Error(c, http.StatusNotFound, "RESOURCE_NOT_FOUND", "Session not found", nil)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) CSRF(c *gin.Context) {
	token, err := randomToken()
	if err != nil {
		api.InternalError(c)
		return
	}
	c.SetCookie("clientops_csrf", token, int((24 * time.Hour).Seconds()), "/", "", h.cfg.CookieSecure, false)
	api.Success(c, http.StatusOK, nil, "CSRF token issued")
}

func (h *Handler) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(h.cfg.AccessCookieName)
		if err != nil {
			api.Error(c, http.StatusUnauthorized, "AUTHENTICATION_REQUIRED", "Authentication required", nil)
			return
		}
		user, err := h.service.User(token)
		if err != nil {
			api.Error(c, http.StatusUnauthorized, "SESSION_EXPIRED", "Session expired", nil)
			return
		}
		c.Set(userKey, user)
		c.Next()
	}
}

func (h *Handler) CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead || c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		cookie, cookieErr := c.Cookie("clientops_csrf")
		header := c.GetHeader("X-CSRF-Token")
		if cookieErr != nil || header == "" || subtle.ConstantTimeCompare([]byte(cookie), []byte(header)) != 1 {
			api.Error(c, http.StatusForbidden, "CSRF_VALIDATION_FAILED", "CSRF validation failed", nil)
			return
		}
		c.Next()
	}
}

func Require(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := currentUser(c)
		if !ok {
			api.Error(c, http.StatusUnauthorized, "AUTHENTICATION_REQUIRED", "Authentication required", nil)
			return
		}
		for _, value := range user.Permissions {
			if value == permission {
				c.Next()
				return
			}
		}
		api.Error(c, http.StatusForbidden, "PERMISSION_DENIED", "Permission denied", nil)
	}
}

func CurrentUser(c *gin.Context) User { user, _ := currentUser(c); return user }
func HasRole(c *gin.Context, roles ...string) bool {
	user, ok := currentUser(c)
	if !ok {
		return false
	}
	for _, role := range user.Roles {
		for _, allowed := range roles {
			if role == allowed {
				return true
			}
		}
	}
	return false
}
func currentUser(c *gin.Context) (User, bool) {
	user, ok := c.Get(userKey)
	if !ok {
		return User{}, false
	}
	value, ok := user.(User)
	return value, ok && value.ID != ""
}
func publicUser(user User) gin.H {
	return gin.H{"id": user.ID, "name": user.Name, "email": user.Email, "roles": user.Roles, "permissions": user.Permissions}
}
func (h *Handler) setTokens(c *gin.Context, access, refresh string) {
	c.SetCookie(h.cfg.AccessCookieName, access, int((15 * time.Minute).Seconds()), "/", "", h.cfg.CookieSecure, true)
	c.SetCookie(h.cfg.RefreshCookieName, refresh, int((30 * 24 * time.Hour).Seconds()), "/api/v1/auth", "", h.cfg.CookieSecure, true)
}
func (h *Handler) clearTokens(c *gin.Context) {
	c.SetCookie(h.cfg.AccessCookieName, "", -1, "/", "", h.cfg.CookieSecure, true)
	c.SetCookie(h.cfg.RefreshCookieName, "", -1, "/api/v1/auth", "", h.cfg.CookieSecure, true)
}
