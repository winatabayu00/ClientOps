package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrSessionInvalid = errors.New("session invalid")

type User struct {
	ID          string
	Name        string
	Email       string
	Permissions []string
	Roles       []string
}

type Service struct {
	db        *gorm.DB
	accessKey []byte
}
type Session struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id,omitempty"`
	UserAgent  *string   `json:"user_agent"`
	IPAddress  *string   `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	Current    bool      `json:"current"`
}

func NewService(db *gorm.DB, accessKey string) *Service {
	return &Service{db: db, accessKey: []byte(accessKey)}
}

func (s *Service) Login(email, password, userAgent, ip string) (User, string, string, error) {
	var user User
	var hash string
	err := s.db.Raw(`SELECT id, name, email, password_hash FROM users WHERE lower(email) = lower(?) AND is_active = true`, email).Row().Scan(&user.ID, &user.Name, &user.Email, &hash)
	if err != nil || !verifyPassword(hash, password) {
		return User{}, "", "", ErrInvalidCredentials
	}
	if err := s.loadAccess(&user); err != nil {
		return User{}, "", "", err
	}
	access, err := s.signAccess(user.ID)
	if err != nil {
		return User{}, "", "", err
	}
	refresh, err := randomToken()
	if err != nil {
		return User{}, "", "", err
	}
	if err = s.db.Exec(`INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, NULLIF(?, '')::inet)`, user.ID, tokenHash(refresh), time.Now().Add(30*24*time.Hour), userAgent, ip).Error; err != nil {
		return User{}, "", "", err
	}
	return user, access, refresh, nil
}

func (s *Service) Refresh(refresh, userAgent, ip string) (string, string, error) {
	var userID string
	err := s.db.Raw(`SELECT user_id FROM auth_sessions WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`, tokenHash(refresh)).Row().Scan(&userID)
	if err != nil {
		return "", "", ErrSessionInvalid
	}
	newRefresh, err := randomToken()
	if err != nil {
		return "", "", err
	}
	access, err := s.signAccess(userID)
	if err != nil {
		return "", "", err
	}
	result := s.db.Exec(`UPDATE auth_sessions SET refresh_token_hash = ?, last_used_at = NOW(), user_agent = ?, ip_address = NULLIF(?, '')::inet WHERE refresh_token_hash = ? AND revoked_at IS NULL`, tokenHash(newRefresh), userAgent, ip, tokenHash(refresh))
	if result.Error != nil {
		return "", "", result.Error
	}
	if result.RowsAffected != 1 {
		return "", "", ErrSessionInvalid
	}
	return access, newRefresh, nil
}

func (s *Service) Logout(refresh string) error {
	return s.db.Exec(`UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = ? AND revoked_at IS NULL`, tokenHash(refresh)).Error
}
func (s *Service) Sessions(userID, refresh string) ([]Session, error) {
	var sessions []Session
	err := s.db.Raw(`SELECT id, user_id, user_agent, ip_address::text ip_address, created_at, last_used_at, expires_at, refresh_token_hash = ? AS current FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW() ORDER BY last_used_at DESC`, tokenHash(refresh), userID).Scan(&sessions).Error
	return sessions, err
}
func (s *Service) RevokeSession(userID, sessionID string) (bool, error) {
	result := s.db.Exec(`UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ? AND user_id = ? AND revoked_at IS NULL`, sessionID, userID)
	return result.RowsAffected == 1, result.Error
}

func (s *Service) User(access string) (User, error) {
	id, err := s.verifyAccess(access)
	if err != nil {
		return User{}, ErrSessionInvalid
	}
	var user User
	if err = s.db.Raw(`SELECT id, name, email FROM users WHERE id = ? AND is_active = true`, id).Row().Scan(&user.ID, &user.Name, &user.Email); err != nil {
		return User{}, ErrSessionInvalid
	}
	if err = s.loadAccess(&user); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Service) loadAccess(user *User) error {
	roleRows, err := s.db.Raw(`SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.name`, user.ID).Rows()
	if err != nil {
		return err
	}
	defer roleRows.Close()
	for roleRows.Next() {
		var role string
		if err := roleRows.Scan(&role); err != nil {
			return err
		}
		user.Roles = append(user.Roles, role)
	}
	permissionRows, err := s.db.Raw(`SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ? ORDER BY p.code`, user.ID).Rows()
	if err != nil {
		return err
	}
	defer permissionRows.Close()
	for permissionRows.Next() {
		var permission string
		if err := permissionRows.Scan(&permission); err != nil {
			return err
		}
		user.Permissions = append(user.Permissions, permission)
	}
	return nil
}

func (s *Service) signAccess(id string) (string, error) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, err := json.Marshal(map[string]interface{}{"sub": id, "exp": time.Now().Add(15 * time.Minute).Unix()})
	if err != nil {
		return "", err
	}
	body := header + "." + base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, s.accessKey)
	_, _ = mac.Write([]byte(body))
	return body + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

func (s *Service) verifyAccess(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", ErrSessionInvalid
	}
	mac := hmac.New(sha256.New, s.accessKey)
	_, _ = mac.Write([]byte(parts[0] + "." + parts[1]))
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(signature, mac.Sum(nil)) {
		return "", ErrSessionInvalid
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	var claims struct {
		Subject   string `json:"sub"`
		ExpiresAt int64  `json:"exp"`
	}
	if err = json.Unmarshal(payload, &claims); err != nil || claims.ExpiresAt <= time.Now().Unix() {
		return "", ErrSessionInvalid
	}
	return claims.Subject, nil
}

func randomToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}
func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func verifyPassword(encoded, password string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false
	}
	params := map[string]uint32{}
	for _, pair := range strings.Split(parts[3], ",") {
		key, value, ok := strings.Cut(pair, "=")
		if !ok {
			return false
		}
		parsed, err := strconv.ParseUint(value, 10, 32)
		if err != nil {
			return false
		}
		params[key] = uint32(parsed)
	}
	memory, okMemory := params["m"]
	iterations, okIterations := params["t"]
	parallelism, okParallelism := params["p"]
	if !okMemory || !okIterations || !okParallelism || parallelism == 0 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, uint8(parallelism), uint32(len(expected)))
	return hmac.Equal(actual, expected)
}

// HashPassword emits the PHC Argon2id format verified during login.
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	const memory uint32 = 64 * 1024
	const iterations uint32 = 3
	const parallelism uint8 = 2
	hash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, 32)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, memory, iterations, parallelism, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash)), nil
}
