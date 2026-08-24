package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
)

func TestCSRFIssuesReadableCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHandler(nil, config.Config{})
	r := gin.New()
	r.GET("/csrf", h.CSRF)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/csrf", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("got status %d", w.Code)
	}
	cookie := w.Result().Cookies()[0]
	if cookie.Name != "clientops_csrf" || cookie.Value == "" || cookie.HttpOnly {
		t.Fatalf("invalid CSRF cookie: %#v", cookie)
	}
}

func TestCSRFProtectionRejectsMissingOrMismatchedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHandler(nil, config.Config{})
	r := gin.New()
	r.POST("/resource", h.CSRFProtection(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	for _, tc := range []struct{ name, cookie, header string }{
		{"missing", "", ""},
		{"mismatched", "token", "other"},
		{"matching", "token", "token"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/resource", nil)
			if tc.cookie != "" {
				req.AddCookie(&http.Cookie{Name: "clientops_csrf", Value: tc.cookie})
			}
			req.Header.Set("X-CSRF-Token", tc.header)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			want := http.StatusForbidden
			if tc.name == "matching" {
				want = http.StatusNoContent
			}
			if w.Code != want {
				t.Fatalf("got status %d, want %d", w.Code, want)
			}
		})
	}
}

func TestRequireRejectsMissingPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", func(c *gin.Context) { c.Set(userKey, User{ID: "trusted-user", Permissions: []string{"issue.read"}}) }, Require("issue.close"), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
	if w.Code != http.StatusForbidden {
		t.Fatalf("got status %d", w.Code)
	}
}

func TestRequireRejectsMissingIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", Require("issue.read"), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("got status %d", w.Code)
	}
}

func TestRequireAllowsTrustedPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", func(c *gin.Context) { c.Set(userKey, User{ID: "trusted-user", Permissions: []string{"issue.read"}}) }, Require("issue.read"), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
	if w.Code != http.StatusNoContent {
		t.Fatalf("got status %d", w.Code)
	}
}
