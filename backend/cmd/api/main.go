package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/errorshim"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
	"github.com/winatabayu00/school-success-platform/backend/internal/audit"
	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"github.com/winatabayu00/school-success-platform/backend/internal/clients"
	"github.com/winatabayu00/school-success-platform/backend/internal/dashboard"
	"github.com/winatabayu00/school-success-platform/backend/internal/docs"
	"github.com/winatabayu00/school-success-platform/backend/internal/feature_requests"
	"github.com/winatabayu00/school-success-platform/backend/internal/health"
	"github.com/winatabayu00/school-success-platform/backend/internal/issues"
	"github.com/winatabayu00/school-success-platform/backend/internal/notifications"
	"github.com/winatabayu00/school-success-platform/backend/internal/operations"
	"github.com/winatabayu00/school-success-platform/backend/internal/releases"
	"github.com/winatabayu00/school-success-platform/backend/internal/users"
	"github.com/winatabayu00/school-success-platform/backend/pkg/cache"
	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
	"github.com/winatabayu00/school-success-platform/backend/pkg/database"
	"github.com/winatabayu00/school-success-platform/backend/pkg/metrics"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}

	router := gin.New()
	caches := cache.New(cfg.RedisAddr)
	router.Use(api.RequestIDMiddleware(), gin.Logger(), errorshim.Recovery(), api.DashboardCacheInvalidation(caches), func(c *gin.Context) { c.Next(); metrics.Record(c.Writer.Status()) })
	router.GET("/health", health.Live)
	router.GET("/ready", health.Ready(db))
	router.GET("/metrics", gin.WrapF(metrics.Handler))
	router.GET("/api/docs", func(c *gin.Context) {
		c.Header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com")
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`<!doctype html><html><head><meta charset="utf-8"><title>ClientOps API</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"/api/docs/openapi.yaml",dom_id:"#swagger-ui"})</script></body></html>`))
	})
	router.StaticFile("/api/docs/openapi.yaml", "docs/api/openapi.yaml")
	apiV1 := router.Group("/api/v1")
	authHandler := auth.NewHandler(auth.NewService(db, cfg.AccessTokenKey), cfg)
	rateLimiter := auth.NewRateLimiter(cfg.RedisAddr)
	authRoutes := apiV1.Group("/auth")
	authRoutes.GET("/csrf", authHandler.CSRF)
	authRoutes.Use(authHandler.CSRFProtection())
	authRoutes.POST("/login", rateLimiter.Limit("login", 10, time.Minute), authHandler.Login)
	authRoutes.POST("/refresh", rateLimiter.Limit("refresh", 30, time.Minute), authHandler.Refresh)
	authRoutes.POST("/logout", authHandler.Authenticate(), authHandler.Logout)
	authRoutes.GET("/me", authHandler.Authenticate(), authHandler.Me)
	authRoutes.GET("/sessions", authHandler.Authenticate(), authHandler.Sessions)
	authRoutes.DELETE("/sessions/:id", authHandler.Authenticate(), authHandler.RevokeSession)
	userHandler := users.NewHandler(users.NewService(db))
	userRoutes := apiV1.Group("/users", authHandler.Authenticate(), authHandler.CSRFProtection(), auth.Require("user.manage"))
	userRoutes.GET("", userHandler.ListUsers)
	userRoutes.POST("", userHandler.CreateUser)
	userRoutes.GET("/:id", userHandler.GetUser)
	userRoutes.PATCH("/:id", userHandler.UpdateUser)
	userRoutes.PUT("/:id/roles", userHandler.SetRoles)
	userRoutes.GET("/:id/sessions", authHandler.UserSessions)
	userRoutes.DELETE("/:id/sessions/:sessionID", authHandler.RevokeUserSession)
	auditHandler := audit.NewHandler(audit.NewService(db))
	auditRoutes := apiV1.Group("/audit-logs", authHandler.Authenticate(), auth.Require("audit.read"))
	auditRoutes.GET("", auditHandler.List)
	auditRoutes.GET("/:id", auditHandler.Get)
	roleRoutes := apiV1.Group("/roles", authHandler.Authenticate(), authHandler.CSRFProtection(), auth.Require("role.manage"))
	roleRoutes.GET("", userHandler.ListRoles)
	roleRoutes.POST("", userHandler.CreateRole)
	roleRoutes.GET("/:id", userHandler.GetRole)
	roleRoutes.PATCH("/:id", userHandler.UpdateRole)
	roleRoutes.DELETE("/:id", userHandler.DeleteRole)
	apiV1.GET("/permissions", authHandler.Authenticate(), auth.Require("role.manage"), userHandler.Permissions)
	clientHandler := clients.NewHandler(clients.NewService(db))
	clientRoutes := apiV1.Group("/clients", authHandler.Authenticate(), authHandler.CSRFProtection())
	clientRoutes.GET("", auth.Require("client.read"), clientHandler.List)
	clientRoutes.POST("", auth.Require("client.create"), clientHandler.Create)
	clientRoutes.GET("/:id", auth.Require("client.read"), clientHandler.Get)
	clientRoutes.GET("/:id/health", auth.Require("client.read"), clientHandler.Health)
	clientRoutes.PATCH("/:id", auth.Require("client.update"), clientHandler.Update)
	clientRoutes.POST("/:id/archive", auth.Require("client.archive"), clientHandler.Archive)
	clientRoutes.GET("/:id/owners", auth.Require("client.read"), clientHandler.Owners)
	clientRoutes.POST("/:id/owners", auth.Require("client.assign_owner"), clientHandler.AddOwner)
	clientRoutes.POST("/:id/change-primary-owner", auth.Require("client.assign_owner"), clientHandler.ChangePrimaryOwner)
	clientRoutes.GET("/:id/contacts", auth.Require("client.read"), clientHandler.Contacts)
	clientRoutes.POST("/:id/contacts", auth.Require("client.update"), clientHandler.AddContact)
	dashboardHandler := dashboard.NewHandler(dashboard.NewService(db, caches))
	apiV1.GET("/dashboard/overview", authHandler.Authenticate(), auth.Require("client.read"), dashboardHandler.Overview)
	clientRoutes.GET("/:id/timeline", auth.Require("client.read"), dashboardHandler.Timeline)
	featureRequestHandler := feature_requests.NewHandler(feature_requests.NewService(db))
	featureRequestRoutes := apiV1.Group("/feature-requests", authHandler.Authenticate(), authHandler.CSRFProtection())
	featureRequestRoutes.GET("", auth.Require("feature_request.read"), featureRequestHandler.List)
	featureRequestRoutes.POST("", auth.Require("feature_request.create"), featureRequestHandler.Create)
	featureRequestRoutes.GET("/:id", auth.Require("feature_request.read"), featureRequestHandler.Get)
	featureRequestRoutes.POST("/:id/add-client", auth.Require("feature_request.create"), featureRequestHandler.AddClient)
	featureRequestRoutes.POST("/:id/start-review", auth.Require("feature_request.review"), featureRequestHandler.Action("UNDER_REVIEW"))
	featureRequestRoutes.POST("/:id/accept", auth.Require("feature_request.review"), featureRequestHandler.Action("ACCEPTED"))
	featureRequestRoutes.POST("/:id/reject", auth.Require("feature_request.review"), featureRequestHandler.Action("REJECTED"))
	featureRequestRoutes.POST("/:id/mark-planned", auth.Require("feature_request.prioritize"), featureRequestHandler.Action("PLANNED"))
	featureRequestRoutes.POST("/:id/start-development", auth.Require("feature_request.update"), featureRequestHandler.Action("IN_DEVELOPMENT"))
	featureRequestRoutes.POST("/:id/mark-released", auth.Require("feature_request.update"), featureRequestHandler.Action("RELEASED"))
	featureRequestRoutes.POST("/:id/mark-delivered", auth.Require("feature_request.close"), featureRequestHandler.Action("DELIVERED"))
	featureRequestRoutes.POST("/:id/mark-duplicate", auth.Require("feature_request.merge"), featureRequestHandler.Action("DUPLICATE"))
	notificationHandler := notifications.NewHandler(notifications.NewService(db))
	objectStore, err := issues.NewObjectStore(cfg)
	if err != nil {
		log.Fatal(err)
	}
	issueService := issues.NewService(db, objectStore)
	issueHandler := issues.NewHandler(issueService)
	issueRoutes := apiV1.Group("/issues", authHandler.Authenticate(), authHandler.CSRFProtection())
	issueRoutes.GET("", auth.Require("issue.read"), issueHandler.List)
	issueRoutes.POST("", auth.Require("issue.create"), issueHandler.Create)
	issueRoutes.GET("/:id", auth.Require("issue.read"), issueHandler.Get)
	issueRoutes.PATCH("/:id", auth.Require("issue.update"), issueHandler.Update)
	issueRoutes.POST("/:id/triage", auth.Require("issue.triage"), issueHandler.Triage)
	issueRoutes.POST("/:id/assign", auth.Require("issue.assign"), issueHandler.Assign)
	issueRoutes.POST("/:id/start-investigation", auth.Require("issue.investigate"), issueHandler.StartInvestigation)
	issueRoutes.POST("/:id/start-development", auth.Require("issue.start_development"), issueHandler.StartDevelopment)
	issueRoutes.POST("/:id/mark-qa", auth.Require("issue.mark_qa"), issueHandler.MarkQA)
	issueRoutes.POST("/:id/qa-failed", auth.Require("issue.mark_qa"), issueHandler.QAFailed)
	issueRoutes.POST("/:id/mark-released", auth.Require("issue.mark_released"), issueHandler.MarkReleased)
	issueRoutes.POST("/:id/start-follow-up", auth.Require("issue.follow_up"), issueHandler.StartFollowUp)
	issueRoutes.POST("/:id/close", auth.Require("issue.close"), issueHandler.Close)
	issueRoutes.POST("/:id/reopen", auth.Require("issue.reopen"), issueHandler.Reopen)
	issueRoutes.POST("/:id/work-state", auth.Require("issue.manage_work_state"), issueHandler.SetWorkState)
	issueRoutes.GET("/:id/history", auth.Require("issue.read"), issueHandler.History)
	issueRoutes.GET("/:id/work-history", auth.Require("issue.read"), issueHandler.WorkHistory)
	issueRoutes.GET("/:id/attachments", auth.Require("issue.read"), issueHandler.ListAttachments)
	issueRoutes.POST("/:id/attachments", auth.Require("issue.update"), issueHandler.UploadAttachment)
	issueRoutes.GET("/:id/attachments/:attachmentID/download", auth.Require("issue.read"), issueHandler.DownloadAttachment)
	issueRoutes.DELETE("/:id/attachments/:attachmentID", auth.Require("issue.update"), issueHandler.DeleteAttachment)
	notificationRoutes := apiV1.Group("/notifications", authHandler.Authenticate(), authHandler.CSRFProtection())
	notificationRoutes.GET("", notificationHandler.List)
	notificationRoutes.GET("/unread-count", notificationHandler.UnreadCount)
	notificationRoutes.POST("/:id/read", notificationHandler.MarkRead)
	notificationRoutes.POST("/read-all", notificationHandler.MarkAllRead)
	releaseHandler := releases.NewHandler(releases.NewService(db))
	releaseRoutes := apiV1.Group("/releases", authHandler.Authenticate(), authHandler.CSRFProtection())
	releaseRoutes.GET("", auth.Require("release.read"), releaseHandler.List)
	releaseRoutes.POST("", auth.Require("release.create"), releaseHandler.Create)
	releaseRoutes.GET("/:id", auth.Require("release.read"), releaseHandler.Get)
	releaseRoutes.POST("/:id/items", auth.Require("release.update"), releaseHandler.AddItem)
	releaseRoutes.POST("/:id/impacts", auth.Require("release.manage_impact"), releaseHandler.Impacts)
	releaseRoutes.POST("/:id/ready", auth.Require("release.update"), releaseHandler.Ready)
	releaseRoutes.POST("/:id/publish", auth.Require("release.publish"), releaseHandler.Publish)
	documentationHandler := docs.NewHandler(docs.NewService(db))
	documentationRoutes := apiV1.Group("/documentation", authHandler.Authenticate(), authHandler.CSRFProtection())
	documentationRoutes.GET("", auth.Require("documentation.read"), documentationHandler.List)
	documentationRoutes.POST("", auth.Require("documentation.create"), documentationHandler.Create)
	documentationRoutes.GET("/:id", auth.Require("documentation.read"), documentationHandler.Get)
	documentationRoutes.PATCH("/:id", auth.Require("documentation.update"), documentationHandler.Edit)
	documentationRoutes.POST("/:id/submit-review", auth.Require("documentation.review"), documentationHandler.Action("review"))
	documentationRoutes.POST("/:id/publish", auth.Require("documentation.publish"), documentationHandler.Action("publish"))
	documentationRoutes.POST("/:id/archive", auth.Require("documentation.archive"), documentationHandler.Action("archive"))
	documentationRoutes.POST("/:id/releases", auth.Require("documentation.update"), documentationHandler.LinkRelease)
	documentationRoutes.POST("/:id/feature-requests", auth.Require("documentation.update"), documentationHandler.LinkFeatureRequest)
	operationsHandler := operations.NewHandler(operations.NewService(db))
	handoffRoutes := apiV1.Group("/handoffs", authHandler.Authenticate(), authHandler.CSRFProtection())
	handoffRoutes.GET("", auth.Require("release.read"), operationsHandler.ListHandoffs)
	handoffRoutes.GET("/:id", auth.Require("release.read"), operationsHandler.GetHandoff)
	handoffRoutes.POST("/:id/acknowledge", auth.Require("issue.follow_up"), operationsHandler.Acknowledge)
	handoffRoutes.POST("/:id/complete", auth.Require("issue.follow_up"), operationsHandler.CompleteHandoff)
	followUpRoutes := apiV1.Group("/follow-ups", authHandler.Authenticate(), authHandler.CSRFProtection())
	followUpRoutes.GET("", auth.Require("client_followup.create"), operationsHandler.ListFollowUps)
	followUpRoutes.POST("", auth.Require("client_followup.create"), operationsHandler.CreateFollowUp)
	followUpRoutes.POST("/:id/start", auth.Require("client_followup.create"), operationsHandler.StartFollowUp)
	followUpRoutes.POST("/:id/complete", auth.Require("client_followup.complete"), operationsHandler.CompleteFollowUp)

	log.Fatal(router.Run(":" + cfg.Port))
}
