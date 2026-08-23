package clients

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

var (
	ErrNotFound        = errors.New("not found")
	ErrVersionConflict = errors.New("version conflict")
	ErrPrimaryExists   = errors.New("primary owner exists")
)

type Client struct {
	ID                string     `json:"id"`
	Code              string     `json:"code"`
	Name              string     `json:"name"`
	Slug              string     `json:"slug"`
	Type              string     `json:"type"`
	Status            string     `json:"status"`
	Province          *string    `json:"province"`
	City              *string    `json:"city"`
	Address           *string    `json:"address"`
	SubscriptionStart *time.Time `json:"subscription_start"`
	SubscriptionEnd   *time.Time `json:"subscription_end"`
	Version           int        `json:"version"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	ArchivedAt        *time.Time `json:"archived_at"`
	Health            *Health    `json:"health,omitempty" gorm:"-"`
}
type Health struct {
	Score          int       `json:"score"`
	Classification string    `json:"classification"`
	Factors        []Factor  `json:"factors"`
	CalculatedAt   time.Time `json:"calculated_at"`
}
type Factor struct {
	Code        string `json:"code"`
	Impact      int    `json:"impact"`
	Description string `json:"description"`
}
type healthInputs struct {
	ID                   string
	CriticalUnresolved   bool
	SLABreached          bool
	OverdueFollowUp      bool
	MissingDocumentation bool
}
type Owner struct {
	ID           string     `json:"id"`
	UserID       string     `json:"user_id"`
	OwnerType    string     `json:"owner_type"`
	AssignedAt   time.Time  `json:"assigned_at"`
	UnassignedAt *time.Time `json:"unassigned_at"`
}
type Contact struct {
	ID        string  `json:"id"`
	ClientID  string  `json:"client_id"`
	Name      string  `json:"name"`
	Position  *string `json:"position"`
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	IsPrimary bool    `json:"is_primary"`
}
type CreateInput struct {
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	Status         string  `json:"status"`
	Province       *string `json:"province"`
	City           *string `json:"city"`
	Address        *string `json:"address"`
	PrimaryOwnerID *string `json:"primary_owner_id"`
}
type UpdateInput struct {
	Name, Type, Status, Province, City, Address *string
	Version                                     int
}
type ListInput struct {
	Page, Limit                                        int
	Search, Status, Type, OwnerID, Health, Sort, Order string
}
type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func slug(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			return r
		}
		return ' '
	}, value)), "-"))
}

func (s *Service) Create(in CreateInput) (Client, error) {
	var client Client
	if in.Status == "" {
		in.Status = "ONBOARDING"
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`INSERT INTO clients (code,name,slug,type,status,province,city,address) VALUES (?,?,?,?,?,?,?,?) RETURNING id,code,name,slug,type,status,province,city,address,version,created_at,updated_at`, in.Code, in.Name, slug(in.Name), in.Type, in.Status, in.Province, in.City, in.Address).Scan(&client).Error; err != nil {
			return err
		}
		if in.PrimaryOwnerID != nil {
			return tx.Exec(`INSERT INTO client_owners (client_id,user_id,owner_type) VALUES (?,?,'PRIMARY')`, client.ID, *in.PrimaryOwnerID).Error
		}
		return nil
	})
	return client, err
}
func (s *Service) List(in ListInput, userID string, scoped bool) ([]Client, int64, error) {
	q := s.db.Model(&Client{}).Table("clients c").Where("c.archived_at IS NULL")
	if scoped {
		q = q.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = c.id AND co.user_id = ? AND co.unassigned_at IS NULL)", userID)
	}
	if in.Search != "" {
		q = q.Where("(c.name ILIKE ? OR c.code ILIKE ?)", "%"+in.Search+"%", "%"+in.Search+"%")
	}
	if in.Status != "" {
		q = q.Where("c.status = ?", in.Status)
	}
	if in.Type != "" {
		q = q.Where("c.type = ?", in.Type)
	}
	if in.OwnerID != "" {
		q = q.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = c.id AND co.user_id = ? AND co.unassigned_at IS NULL)", in.OwnerID)
	}
	if in.Health != "" {
		q = q.Where(healthClassificationSQL("c")+" = ?", in.Health)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	sort := map[string]string{"name": "c.name", "created_at": "c.created_at", "updated_at": "c.updated_at", "code": "c.code"}[in.Sort]
	if sort == "" {
		sort = "c.name"
	}
	order := "ASC"
	if strings.EqualFold(in.Order, "desc") {
		order = "DESC"
	}
	var clients []Client
	err := q.Order(sort + " " + order).Offset((in.Page - 1) * in.Limit).Limit(in.Limit).Find(&clients).Error
	if err == nil {
		err = s.addHealth(clients)
	}
	return clients, total, err
}
func (s *Service) Get(id, userID string, scoped bool) (Client, error) {
	var client Client
	q := s.db.Table("clients c").Where("c.id = ? AND c.archived_at IS NULL", id)
	if scoped {
		q = q.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = c.id AND co.user_id = ? AND co.unassigned_at IS NULL)", userID)
	}
	err := q.First(&client).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return client, ErrNotFound
	}
	if err == nil {
		client.Health, err = s.Health(id)
	}
	return client, err
}
func (s *Service) Health(clientID string) (*Health, error) {
	var input healthInputs
	err := s.db.Raw(healthInputsSQL("WHERE c.id = ?"), clientID).Scan(&input).Error
	if err != nil {
		return nil, err
	}
	if input.ID == "" {
		return nil, ErrNotFound
	}
	return calculateHealth(input, time.Now().UTC()), nil
}
func (s *Service) addHealth(clients []Client) error {
	if len(clients) == 0 {
		return nil
	}
	ids := make([]string, len(clients))
	for i := range clients {
		ids[i] = clients[i].ID
	}
	var inputs []healthInputs
	if err := s.db.Raw(healthInputsSQL("WHERE c.id IN ?"), ids).Scan(&inputs).Error; err != nil {
		return err
	}
	byID := make(map[string]healthInputs, len(inputs))
	for _, input := range inputs {
		byID[input.ID] = input
	}
	now := time.Now().UTC()
	for i := range clients {
		clients[i].Health = calculateHealth(byID[clients[i].ID], now)
	}
	return nil
}
func calculateHealth(in healthInputs, now time.Time) *Health {
	health := &Health{Score: 100, CalculatedAt: now}
	for _, factor := range []struct {
		applies     bool
		code        string
		impact      int
		description string
	}{
		{in.CriticalUnresolved, "CRITICAL_UNRESOLVED", -20, "Critical unresolved issue"},
		{in.SLABreached, "SLA_BREACH", -15, "Issue breached its SLA"},
		{in.OverdueFollowUp, "OVERDUE_FOLLOW_UP", -10, "Follow-up is overdue"},
		{in.MissingDocumentation, "MISSING_DOCUMENTATION", -5, "Published client impact has no published documentation"},
	} {
		if factor.applies {
			health.Score += factor.impact
			health.Factors = append(health.Factors, Factor{factor.code, factor.impact, factor.description})
		}
	}
	if health.Score < 0 {
		health.Score = 0
	}
	if health.Score >= 80 {
		health.Classification = "HEALTHY"
	} else if health.Score >= 60 {
		health.Classification = "ATTENTION"
	} else {
		health.Classification = "AT_RISK"
	}
	return health
}
func healthInputsSQL(where string) string {
	return `SELECT c.id,
		EXISTS (SELECT 1 FROM issues i WHERE i.client_id = c.id AND i.severity = 'CRITICAL' AND i.status NOT IN ('CLOSED', 'CANCELLED')) AS critical_unresolved,
		EXISTS (SELECT 1 FROM issues i JOIN sla_policies sp ON sp.severity = i.severity AND sp.is_active WHERE i.client_id = c.id AND i.status NOT IN ('CLOSED', 'CANCELLED') AND i.reported_at + sp.resolution_minutes * INTERVAL '1 minute' < NOW()) AS sla_breached,
		EXISTS (SELECT 1 FROM client_follow_ups f WHERE f.client_id = c.id AND f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW()) AS overdue_follow_up,
		EXISTS (SELECT 1 FROM release_impacts ri JOIN releases r ON r.id = ri.release_id AND r.status = 'PUBLISHED' WHERE ri.client_id = c.id AND NOT EXISTS (SELECT 1 FROM release_documentations rd JOIN documentations d ON d.id = rd.documentation_id AND d.status = 'PUBLISHED' WHERE rd.release_id = r.id)) AS missing_documentation
		FROM clients c ` + where
}
func healthClassificationSQL(alias string) string {
	return `CASE WHEN (100
		- 20 * (EXISTS (SELECT 1 FROM issues i WHERE i.client_id = ` + alias + `.id AND i.severity = 'CRITICAL' AND i.status NOT IN ('CLOSED', 'CANCELLED')))::int
		- 15 * (EXISTS (SELECT 1 FROM issues i JOIN sla_policies sp ON sp.severity = i.severity AND sp.is_active WHERE i.client_id = ` + alias + `.id AND i.status NOT IN ('CLOSED', 'CANCELLED') AND i.reported_at + sp.resolution_minutes * INTERVAL '1 minute' < NOW()))::int
		- 10 * (EXISTS (SELECT 1 FROM client_follow_ups f WHERE f.client_id = ` + alias + `.id AND f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW()))::int
		- 5 * (EXISTS (SELECT 1 FROM release_impacts ri JOIN releases r ON r.id = ri.release_id AND r.status = 'PUBLISHED' WHERE ri.client_id = ` + alias + `.id AND NOT EXISTS (SELECT 1 FROM release_documentations rd JOIN documentations d ON d.id = rd.documentation_id AND d.status = 'PUBLISHED' WHERE rd.release_id = r.id)))::int) >= 80 THEN 'HEALTHY'
		WHEN (100
		- 20 * (EXISTS (SELECT 1 FROM issues i WHERE i.client_id = ` + alias + `.id AND i.severity = 'CRITICAL' AND i.status NOT IN ('CLOSED', 'CANCELLED')))::int
		- 15 * (EXISTS (SELECT 1 FROM issues i JOIN sla_policies sp ON sp.severity = i.severity AND sp.is_active WHERE i.client_id = ` + alias + `.id AND i.status NOT IN ('CLOSED', 'CANCELLED') AND i.reported_at + sp.resolution_minutes * INTERVAL '1 minute' < NOW()))::int
		- 10 * (EXISTS (SELECT 1 FROM client_follow_ups f WHERE f.client_id = ` + alias + `.id AND f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW()))::int
		- 5 * (EXISTS (SELECT 1 FROM release_impacts ri JOIN releases r ON r.id = ri.release_id AND r.status = 'PUBLISHED' WHERE ri.client_id = ` + alias + `.id AND NOT EXISTS (SELECT 1 FROM release_documentations rd JOIN documentations d ON d.id = rd.documentation_id AND d.status = 'PUBLISHED' WHERE rd.release_id = r.id)))::int) >= 60 THEN 'ATTENTION' ELSE 'AT_RISK' END`
}
func (s *Service) Update(id string, in UpdateInput) (Client, error) {
	var client Client
	fields := map[string]interface{}{"version": gorm.Expr("version + 1"), "updated_at": time.Now()}
	if in.Name != nil {
		fields["name"] = *in.Name
		fields["slug"] = slug(*in.Name)
	}
	if in.Type != nil {
		fields["type"] = *in.Type
	}
	if in.Status != nil {
		fields["status"] = *in.Status
	}
	if in.Province != nil {
		fields["province"] = *in.Province
	}
	if in.City != nil {
		fields["city"] = *in.City
	}
	if in.Address != nil {
		fields["address"] = *in.Address
	}
	result := s.db.Table("clients").Where("id = ? AND version = ? AND archived_at IS NULL", id, in.Version).Updates(fields)
	if result.Error != nil {
		return client, result.Error
	}
	if result.RowsAffected == 0 {
		var exists bool
		s.db.Raw("SELECT EXISTS(SELECT 1 FROM clients WHERE id = ? AND archived_at IS NULL)", id).Scan(&exists)
		if exists {
			return client, ErrVersionConflict
		}
		return client, ErrNotFound
	}
	return s.Get(id, "", false)
}
func (s *Service) Archive(id string, version int) error {
	result := s.db.Exec("UPDATE clients SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = ? AND version = ? AND archived_at IS NULL", id, version)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrVersionConflict
	}
	return nil
}
func (s *Service) Owners(clientID string) ([]Owner, error) {
	var owners []Owner
	err := s.db.Raw("SELECT id,user_id,owner_type,assigned_at,unassigned_at FROM client_owners WHERE client_id = ? ORDER BY assigned_at DESC", clientID).Scan(&owners).Error
	return owners, err
}
func (s *Service) AddOwner(clientID, userID, ownerType string) error {
	if ownerType == "PRIMARY" {
		var n int64
		s.db.Table("client_owners").Where("client_id = ? AND owner_type = 'PRIMARY' AND unassigned_at IS NULL", clientID).Count(&n)
		if n > 0 {
			return ErrPrimaryExists
		}
	}
	return s.db.Exec("INSERT INTO client_owners (client_id,user_id,owner_type) VALUES (?,?,?)", clientID, userID, ownerType).Error
}
func (s *Service) ChangePrimaryOwner(clientID, userID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("UPDATE client_owners SET unassigned_at = NOW() WHERE client_id = ? AND owner_type = 'PRIMARY' AND unassigned_at IS NULL", clientID).Error; err != nil {
			return err
		}
		return tx.Exec("INSERT INTO client_owners (client_id,user_id,owner_type) VALUES (?,?,'PRIMARY')", clientID, userID).Error
	})
}
func (s *Service) Contacts(clientID string) ([]Contact, error) {
	var contacts []Contact
	err := s.db.Table("client_contacts").Where("client_id = ?", clientID).Find(&contacts).Error
	return contacts, err
}
func (s *Service) AddContact(contact Contact) (Contact, error) {
	err := s.db.Raw("INSERT INTO client_contacts (client_id,name,position,email,phone,is_primary) VALUES (?,?,?,?,?,?) RETURNING id,client_id,name,position,email,phone,is_primary", contact.ClientID, contact.Name, contact.Position, contact.Email, contact.Phone, contact.IsPrimary).Scan(&contact).Error
	return contact, err
}
