package api

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const requestIDKey = "request_id"

func RequestID(c *gin.Context) string {
	value, _ := c.Get(requestIDKey)
	id, _ := value.(string)
	return id
}

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			bytes := make([]byte, 16)
			if _, err := rand.Read(bytes); err == nil {
				id = hex.EncodeToString(bytes)
			}
		}
		if id == "" {
			id = "unavailable"
		}
		c.Set(requestIDKey, id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}
