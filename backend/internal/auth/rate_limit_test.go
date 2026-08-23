package auth

import (
	"bufio"
	"net"
	"testing"
	"time"
)

func TestRateLimiterIncrement(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		reader := bufio.NewReader(conn)
		for i := 0; i < 5; i++ {
			if _, err := reader.ReadString('\n'); err != nil {
				return
			}
		}
		_, _ = conn.Write([]byte(":1\r\n"))
		for i := 0; i < 7; i++ {
			if _, err := reader.ReadString('\n'); err != nil {
				return
			}
		}
		_, _ = conn.Write([]byte(":1\r\n"))
	}()
	count, err := (&RateLimiter{address: listener.Addr().String()}).increment("login", time.Minute)
	if err != nil || count != 1 {
		t.Fatalf("increment = %d, %v", count, err)
	}
}
