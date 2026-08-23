package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
)

func testRouter() *httptest.Server {
	r := newRouter(nil, nil, config.Config{
		AccessTokenKey:    "test-access-key",
		AccessCookieName:  "clientops_access",
		RefreshCookieName: "clientops_refresh",
	})
	return httptest.NewServer(r)
}

var publicRoutes = map[string]bool{
	"GET /health":                  true,
	"GET /ready":                   true,
	"GET /metrics":                 true,
	"GET /api/docs":                true,
	"GET /api/docs/openapi.yaml":   true,
	"GET /api/v1/auth/csrf":        true,
	"POST /api/v1/auth/login":      true,
	"POST /api/v1/auth/refresh":    true,
	"POST /api/v1/auth/logout":     true,
}

func isPublic(method, path string) bool {
	if method == http.MethodHead && publicRoutes["GET "+path] {
		return true
	}
	return publicRoutes[method+" "+path]
}

func fillPathParams(path string) string {
	parts := strings.Split(path, "/")
	for i, p := range parts {
		if strings.HasPrefix(p, ":") {
			parts[i] = "sample"
		}
	}
	return strings.Join(parts, "/")
}

// TestProtectedRoutesRejectAbsentCredentials asserts every non-public route
// rejects requests without an access cookie with 401, proving the
// authentication gate covers the whole product surface.
func TestProtectedRoutesRejectAbsentCredentials(t *testing.T) {
	srv := testRouter()
	defer srv.Close()
	client := srv.Client()
	for _, route := range newRouter(nil, nil, config.Config{AccessTokenKey: "k", AccessCookieName: "clientops_access", RefreshCookieName: "clientops_refresh"}).Routes() {
		if isPublic(route.Method, route.Path) {
			continue
		}
		key := route.Method + " " + route.Path
		req, err := http.NewRequest(route.Method, srv.URL+fillPathParams(route.Path), nil)
		if err != nil {
			t.Fatalf("%s: %v", key, err)
		}
		t.Run(key, func(t *testing.T) {
			resp, err := client.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusUnauthorized {
				t.Fatalf("without credentials: got %d, want 401", resp.StatusCode)
			}
		})
	}
}

// TestProtectedRoutesRejectInvalidCredentials asserts a forged/expired access
// cookie is rejected with 401 before any handler-side access occurs.
func TestProtectedRoutesRejectInvalidCredentials(t *testing.T) {
	cfg := config.Config{AccessTokenKey: "k", AccessCookieName: "clientops_access", RefreshCookieName: "clientops_refresh"}
	r := newRouter(nil, nil, cfg)
	srv := httptest.NewServer(r)
	defer srv.Close()
	client := srv.Client()
	for _, route := range r.Routes() {
		if isPublic(route.Method, route.Path) {
			continue
		}
		key := route.Method + " " + route.Path
		req, err := http.NewRequest(route.Method, srv.URL+fillPathParams(route.Path), nil)
		if err != nil {
			t.Fatalf("%s: %v", key, err)
		}
		req.AddCookie(&http.Cookie{Name: cfg.AccessCookieName, Value: "forged"})
		t.Run(key, func(t *testing.T) {
			resp, err := client.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusUnauthorized {
				t.Fatalf("with invalid credentials: got %d, want 401", resp.StatusCode)
			}
		})
	}
}

// TestPublicRoutesAreNotAuthenticationGated pins the public endpoint
// inventory so an oversight cannot silently widen it.
func TestPublicRoutesAreNotAuthenticationGated(t *testing.T) {
	r := newRouter(nil, nil, config.Config{AccessTokenKey: "k", AccessCookieName: "clientops_access", RefreshCookieName: "clientops_refresh"})
	srv := httptest.NewServer(r)
	defer srv.Close()
	client := srv.Client()
	for _, route := range r.Routes() {
		key := route.Method + " " + route.Path
		if !publicRoutes[key] {
			continue
		}
		req, err := http.NewRequest(route.Method, srv.URL+fillPathParams(route.Path), nil)
		if err != nil {
			t.Fatalf("%s: %v", key, err)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode == http.StatusUnauthorized {
			t.Fatalf("%s is public but returns 401", key)
		}
	}
}