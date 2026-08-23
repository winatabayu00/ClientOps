package users

import (
	"errors"
	"strings"

	"github.com/winatabayu00/school-success-platform/backend/internal/auth"
	"gorm.io/gorm"
)

var (
	ErrNotFound    = errors.New("not found")
	ErrConflict    = errors.New("conflict")
	ErrSelfLockout = errors.New("self lockout")
)

type User struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	IsActive bool   `json:"is_active"`
	Roles    []Role `json:"roles" gorm:"-"`
}
type Role struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description *string      `json:"description"`
	Permissions []Permission `json:"permissions" gorm:"-"`
}
type Permission struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Description *string `json:"description"`
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db} }

func (s *Service) ListUsers(search, status, role string, page, limit int) ([]User, int64, error) {
	q := s.db.Table("users u")
	if search != "" {
		q = q.Where("u.name ILIKE ? OR u.email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if status == "ACTIVE" {
		q = q.Where("u.is_active")
	}
	if status == "INACTIVE" {
		q = q.Where("NOT u.is_active")
	}
	if role != "" {
		q = q.Where("EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.id::text = ?)", role)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var users []User
	if err := q.Order("u.name ASC").Offset((page - 1) * limit).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	for i := range users {
		if err := s.loadUser(&users[i]); err != nil {
			return nil, 0, err
		}
	}
	return users, total, nil
}
func (s *Service) GetUser(id string) (User, error) {
	var u User
	if err := s.db.Table("users").Where("id = ?", id).First(&u).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return u, ErrNotFound
	} else if err != nil {
		return u, err
	}
	return u, s.loadUser(&u)
}
func (s *Service) loadUser(u *User) error {
	return s.db.Raw(`SELECT r.id,r.name,r.description FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? ORDER BY r.name`, u.ID).Scan(&u.Roles).Error
}
func (s *Service) CreateUser(name, email, password string, roleIDs []string, actorID, requestID string) (User, error) {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return User{}, err
	}
	var u User
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO users (name,email,password_hash) VALUES (?,?,?) RETURNING id,name,email,is_active`, name, strings.ToLower(email), hash).Scan(&u).Error; err != nil {
			return err
		}
		if err := setRoles(tx, u.ID, roleIDs); err != nil {
			return err
		}
		return audit(tx, actorID, "user.created", "user", u.ID, "", requestID)
	})
	if err != nil {
		return u, mapDB(err)
	}
	return s.GetUser(u.ID)
}
func (s *Service) UpdateUser(id, name, status, actorID, requestID string) (User, error) {
	if id == actorID && status == "INACTIVE" {
		return User{}, ErrSelfLockout
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var u User
		if err := tx.Table("users").Where("id=?", id).First(&u).Error; err != nil {
			return err
		}
		fields := map[string]interface{}{}
		if name != "" {
			fields["name"] = name
		}
		if status != "" {
			fields["is_active"] = status == "ACTIVE"
		}
		if len(fields) == 0 {
			return nil
		}
		if err := tx.Table("users").Where("id=?", id).Updates(fields).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "user.updated", "user", id, "", requestID)
	})
	if err != nil {
		return User{}, mapDB(err)
	}
	return s.GetUser(id)
}
func (s *Service) SetUserRoles(id string, roleIDs []string, actorID, requestID string) error {
	if id == actorID {
		return ErrSelfLockout
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := exists(tx, "users", id); err != nil {
			return err
		}
		if err := setRoles(tx, id, roleIDs); err != nil {
			return err
		}
		return audit(tx, actorID, "user.roles_updated", "user", id, "", requestID)
	})
}
func (s *Service) ListRoles() ([]Role, error) {
	var roles []Role
	if err := s.db.Order("name").Find(&roles).Error; err != nil {
		return nil, err
	}
	for i := range roles {
		if err := s.loadRole(&roles[i]); err != nil {
			return nil, err
		}
	}
	return roles, nil
}
func (s *Service) GetRole(id string) (Role, error) {
	var r Role
	if err := s.db.Where("id=?", id).First(&r).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		return r, ErrNotFound
	} else if err != nil {
		return r, err
	}
	return r, s.loadRole(&r)
}
func (s *Service) loadRole(r *Role) error {
	return s.db.Raw(`SELECT p.id,p.code,p.description FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=? ORDER BY p.code`, r.ID).Scan(&r.Permissions).Error
}
func (s *Service) CreateRole(name string, description *string, permissionIDs []string, actorID, requestID string) (Role, error) {
	var r Role
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO roles (name,description) VALUES (?,?) RETURNING id,name,description`, name, description).Scan(&r).Error; err != nil {
			return err
		}
		if err := setPermissions(tx, r.ID, permissionIDs); err != nil {
			return err
		}
		return audit(tx, actorID, "role.created", "role", r.ID, "", requestID)
	})
	if err != nil {
		return r, mapDB(err)
	}
	return s.GetRole(r.ID)
}
func (s *Service) UpdateRole(id, name string, description *string, permissionIDs []string, actorID, requestID string) (Role, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := exists(tx, "roles", id); err != nil {
			return err
		}
		fields := map[string]interface{}{}
		if name != "" {
			fields["name"] = name
		}
		if description != nil {
			fields["description"] = description
		}
		if len(fields) > 0 {
			if err := tx.Table("roles").Where("id=?", id).Updates(fields).Error; err != nil {
				return err
			}
		}
		if permissionIDs != nil {
			if err := setPermissions(tx, id, permissionIDs); err != nil {
				return err
			}
		}
		return audit(tx, actorID, "role.updated", "role", id, "", requestID)
	})
	if err != nil {
		return Role{}, mapDB(err)
	}
	return s.GetRole(id)
}
func (s *Service) DeleteRole(id, actorID, requestID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := exists(tx, "roles", id); err != nil {
			return err
		}
		var n int64
		if err := tx.Table("user_roles").Where("role_id=?", id).Count(&n).Error; err != nil {
			return err
		}
		if n > 0 {
			return ErrConflict
		}
		if err := tx.Exec("DELETE FROM roles WHERE id=?", id).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "role.deleted", "role", id, "", requestID)
	})
}
func (s *Service) Permissions() ([]Permission, error) {
	var p []Permission
	return p, s.db.Order("code").Find(&p).Error
}
func exists(tx *gorm.DB, table, id string) error {
	var n int64
	if err := tx.Table(table).Where("id=?", id).Count(&n).Error; err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
func setRoles(tx *gorm.DB, userID string, ids []string) error {
	if len(ids) == 0 {
		return ErrConflict
	}
	if err := validateIDs(tx, "roles", ids); err != nil {
		return err
	}
	if err := tx.Exec("DELETE FROM user_roles WHERE user_id=?", userID).Error; err != nil {
		return err
	}
	for _, id := range ids {
		if err := tx.Exec("INSERT INTO user_roles (user_id,role_id) VALUES (?,?)", userID, id).Error; err != nil {
			return err
		}
	}
	return nil
}
func setPermissions(tx *gorm.DB, roleID string, ids []string) error {
	if err := validateIDs(tx, "permissions", ids); err != nil {
		return err
	}
	if err := tx.Exec("DELETE FROM role_permissions WHERE role_id=?", roleID).Error; err != nil {
		return err
	}
	for _, id := range ids {
		if err := tx.Exec("INSERT INTO role_permissions (role_id,permission_id) VALUES (?,?)", roleID, id).Error; err != nil {
			return err
		}
	}
	return nil
}
func validateIDs(tx *gorm.DB, table string, ids []string) error {
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			return ErrConflict
		}
		seen[id] = true
	}
	if len(ids) == 0 {
		return nil
	}
	var n int64
	if err := tx.Table(table).Where("id IN ?", ids).Count(&n).Error; err != nil {
		return err
	}
	if n != int64(len(ids)) {
		return ErrNotFound
	}
	return nil
}
func audit(tx *gorm.DB, actor, action, kind, id, before, requestID string) error {
	return tx.Exec(`INSERT INTO audit_logs (actor_id,action,resource_type,resource_id,before_data,request_id) VALUES (?,?,?,?,NULLIF(?,'')::jsonb,?)`, actor, action, kind, id, before, requestID).Error
}
func mapDB(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}
