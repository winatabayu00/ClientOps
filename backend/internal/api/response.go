package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type errorBody struct {
	Code      string      `json:"code"`
	Details   interface{} `json:"details,omitempty"`
	RequestID string      `json:"request_id"`
}

func Success(c *gin.Context, status int, data interface{}, message string) {
	c.JSON(status, gin.H{"success": true, "data": data, "message": message})
}

func Error(c *gin.Context, status int, code, message string, details interface{}) {
	c.AbortWithStatusJSON(status, gin.H{
		"success": false,
		"error":   errorBody{Code: code, Details: details, RequestID: RequestID(c)},
		"message": message,
	})
}

func InternalError(c *gin.Context) {
	Error(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", nil)
}
