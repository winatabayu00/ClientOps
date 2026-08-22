package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/errorshim"
	"github.com/winatabayu00/school-success-platform/backend/internal/health"
	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
	"github.com/winatabayu00/school-success-platform/backend/pkg/database"
)

func main() {
	cfg := config.Load()
	db, err := database.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}

	router := gin.New()
	router.Use(gin.Logger(), errorshim.Recovery())
	router.GET("/health", health.Live)
	router.GET("/ready", health.Ready(db))

	log.Fatal(router.Run(":" + cfg.Port))
}
