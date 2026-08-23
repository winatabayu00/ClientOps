package auth

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/winatabayu00/school-success-platform/backend/internal/api"
)

type RateLimiter struct{ address string }

func NewRateLimiter(address string) *RateLimiter {
	if address == "" {
		return nil
	}
	return &RateLimiter{address: address}
}

func (r *RateLimiter) Limit(name string, maximum int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if r == nil {
			c.Next()
			return
		}
		key := fmt.Sprintf("rate:%s:%d:%s", name, time.Now().Unix()/int64(window.Seconds()), c.ClientIP())
		count, err := r.increment(key, window)
		if err != nil {
			api.Error(c, http.StatusServiceUnavailable, "RATE_LIMIT_UNAVAILABLE", "Rate limit temporarily unavailable", nil)
			return
		}
		if count > maximum {
			c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))
			api.Error(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Too many requests. Try again shortly", nil)
			return
		}
		c.Next()
	}
}

func (r *RateLimiter) increment(key string, window time.Duration) (int, error) {
	conn, err := net.DialTimeout("tcp", r.address, time.Second)
	if err != nil {
		return 0, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(time.Second))
	reader := bufio.NewReader(conn)
	if _, err = fmt.Fprintf(conn, "*2\r\n$4\r\nINCR\r\n$%d\r\n%s\r\n", len(key), key); err != nil {
		return 0, err
	}
	line, err := reader.ReadString('\n')
	if err != nil || !strings.HasPrefix(line, ":") {
		return 0, fmt.Errorf("redis INCR failed: %w", err)
	}
	count, err := strconv.Atoi(strings.TrimSpace(line[1:]))
	if err != nil {
		return 0, err
	}
	if count == 1 {
		if _, err = fmt.Fprintf(conn, "*3\r\n$6\r\nEXPIRE\r\n$%d\r\n%s\r\n$%d\r\n%d\r\n", len(key), key, len(strconv.Itoa(int(window.Seconds()))), int(window.Seconds())); err != nil {
			return 0, err
		}
		if _, err = reader.ReadString('\n'); err != nil {
			return 0, err
		}
	}
	return count, nil
}
