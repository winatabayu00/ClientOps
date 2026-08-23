package cache

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"time"
)

type Client struct{ address string }

func New(address string) *Client {
	if address == "" {
		return nil
	}
	return &Client{address: address}
}

func (c *Client) Get(key string) (string, bool) {
	if c == nil {
		return "", false
	}
	conn, err := c.conn()
	if err != nil {
		return "", false
	}
	defer conn.Close()
	if err = write(conn, "GET", key); err != nil {
		return "", false
	}
	r := bufio.NewReader(conn)
	line, err := r.ReadString('\n')
	if err != nil || line == "$-1\r\n" || !strings.HasPrefix(line, "$") {
		return "", false
	}
	n, err := strconv.Atoi(strings.TrimSpace(line[1:]))
	if err != nil || n < 0 {
		return "", false
	}
	b := make([]byte, n+2)
	if _, err = io.ReadFull(r, b); err != nil {
		return "", false
	}
	return string(b[:n]), true
}

func (c *Client) Set(key, value string, ttl time.Duration) {
	if c == nil {
		return
	}
	_, _ = c.command("SET", key, value, "EX", strconv.Itoa(int(ttl.Seconds())))
}

func (c *Client) Del(key string) {
	if c != nil {
		_, _ = c.command("DEL", key)
	}
}

func (c *Client) Version() string {
	if c == nil {
		return "0"
	}
	v, ok := c.Get("dashboard:version")
	if !ok {
		return "0"
	}
	return v
}
func (c *Client) InvalidateDashboard() {
	if c != nil {
		_, _ = c.command("INCR", "dashboard:version")
	}
}

func (c *Client) command(parts ...string) (string, error) {
	conn, err := c.conn()
	if err != nil {
		return "", err
	}
	defer conn.Close()
	if err = write(conn, parts...); err != nil {
		return "", err
	}
	return bufio.NewReader(conn).ReadString('\n')
}

func (c *Client) conn() (net.Conn, error) {
	conn, err := net.DialTimeout("tcp", c.address, time.Second)
	if err == nil {
		_ = conn.SetDeadline(time.Now().Add(time.Second))
	}
	return conn, err
}

func write(conn net.Conn, parts ...string) error {
	if _, err := fmt.Fprintf(conn, "*%d\r\n", len(parts)); err != nil {
		return err
	}
	for _, part := range parts {
		if _, err := fmt.Fprintf(conn, "$%d\r\n%s\r\n", len(part), part); err != nil {
			return err
		}
	}
	return nil
}
