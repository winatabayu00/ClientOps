package dashboard

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/winatabayu00/school-success-platform/backend/pkg/cache"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type Overview struct {
	Issues struct {
		Open     int64 `json:"open"`
		Critical int64 `json:"critical"`
	} `json:"issues"`
	Clients struct {
		Active int64 `json:"active"`
	} `json:"clients"`
	FollowUps struct {
		Pending int64 `json:"pending"`
		Overdue int64 `json:"overdue"`
	} `json:"follow_ups"`
	Handoffs struct {
		Pending int64 `json:"pending"`
	} `json:"handoffs"`
	SLA struct {
		Breached int64 `json:"breached"`
	} `json:"sla"`
	StatusDistribution []Count         `json:"status_distribution"`
	WaitingBreakdown   []Duration      `json:"waiting_breakdown"`
	TopFeatureDemand   []FeatureDemand `json:"top_feature_demand"`
	ClientHealth       []Count         `json:"client_health"`
}

type Count struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}
type Duration struct {
	Name    string `json:"name"`
	Seconds int64  `json:"seconds"`
}
type FeatureDemand struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Demand int64  `json:"demand"`
}

type TimelineInput struct {
	Page, Limit int
	Type        string
	From, To    *time.Time
}

type TimelineEvent struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	Title      string    `json:"title"`
	ResourceID string    `json:"resource_id"`
	Resource   string    `json:"resource_type"`
	OccurredAt time.Time `json:"occurred_at"`
}

type Service struct {
	db    *gorm.DB
	cache *cache.Client
}

func NewService(db *gorm.DB, caches ...*cache.Client) *Service {
	var c *cache.Client
	if len(caches) > 0 {
		c = caches[0]
	}
	return &Service{db: db, cache: c}
}

func scope(q *gorm.DB, alias, userID string, scoped bool) *gorm.DB {
	if scoped {
		return q.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = "+alias+".id AND co.user_id = ? AND co.unassigned_at IS NULL)", userID)
	}
	return q
}

func (s *Service) Overview(userID string, scoped bool) (Overview, error) {
	var out Overview
	key := "dashboard:" + s.cache.Version() + ":" + userID + ":" + map[bool]string{true: "scoped", false: "all"}[scoped]
	if raw, ok := s.cache.Get(key); ok && json.Unmarshal([]byte(raw), &out) == nil {
		return out, nil
	}
	clients := scope(s.db.Table("clients c").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := clients.Where("c.status = 'ACTIVE'").Count(&out.Clients.Active).Error; err != nil {
		return out, err
	}
	issues := scope(s.db.Table("issues i JOIN clients c ON c.id = i.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := issues.Where("i.status NOT IN ('CLOSED', 'CANCELLED')").Count(&out.Issues.Open).Error; err != nil {
		return out, err
	}
	if err := issues.Where("i.status NOT IN ('CLOSED', 'CANCELLED') AND i.severity = 'CRITICAL'").Count(&out.Issues.Critical).Error; err != nil {
		return out, err
	}
	followUps := scope(s.db.Table("client_follow_ups f JOIN clients c ON c.id = f.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := followUps.Where("f.status IN ('OPEN', 'IN_PROGRESS')").Count(&out.FollowUps.Pending).Error; err != nil {
		return out, err
	}
	if err := followUps.Where("f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW()").Count(&out.FollowUps.Overdue).Error; err != nil {
		return out, err
	}
	handoffs := scope(s.db.Table("operational_handoffs h JOIN clients c ON c.id = h.client_id").Where("c.archived_at IS NULL"), "c", userID, scoped)
	if err := handoffs.Where("h.status = 'PENDING'").Count(&out.Handoffs.Pending).Error; err != nil {
		return out, err
	}
	if err := issues.Where("i.status NOT IN ('CLOSED', 'CANCELLED') AND " + slaBreachedSQL()).Count(&out.SLA.Breached).Error; err != nil {
		return out, err
	}
	if err := issues.Select("i.status AS name, COUNT(*) AS count").Group("i.status").Order("i.status").Scan(&out.StatusDistribution).Error; err != nil {
		return out, err
	}
	waiting := scope(s.db.Table("issue_work_states ws JOIN issues i ON i.id = ws.issue_id JOIN clients c ON c.id = i.client_id").Where("c.archived_at IS NULL AND ws.state <> 'ACTIVE'"), "c", userID, scoped)
	if err := waiting.Select("ws.state AS name, COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ws.ended_at, NOW()) - ws.started_at))), 0)::bigint AS seconds").Group("ws.state").Order("ws.state").Scan(&out.WaitingBreakdown).Error; err != nil {
		return out, err
	}
	demand := s.db.Table("feature_requests fr JOIN feature_request_clients frc ON frc.feature_request_id = fr.id")
	if scoped {
		demand = demand.Where("EXISTS (SELECT 1 FROM client_owners co WHERE co.client_id = frc.client_id AND co.user_id = ? AND co.unassigned_at IS NULL)", userID)
	}
	if err := demand.Select("fr.id, fr.title, COUNT(frc.client_id) AS demand").Group("fr.id, fr.title").Order("demand DESC, fr.first_requested_at ASC").Limit(5).Scan(&out.TopFeatureDemand).Error; err != nil {
		return out, err
	}
	health := scope(s.db.Table("clients c").Where("c.archived_at IS NULL AND c.status = 'ACTIVE'"), "c", userID, scoped)
	score := `100
 - 20 * (SELECT COUNT(*) FROM issues i WHERE i.client_id = c.id AND i.severity = 'CRITICAL' AND i.status NOT IN ('CLOSED', 'CANCELLED'))
 - 15 * (SELECT COUNT(*) FROM issues i WHERE i.client_id = c.id AND i.status NOT IN ('CLOSED', 'CANCELLED') AND ` + slaBreachedSQL() + `)
 - 10 * (SELECT COUNT(*) FROM client_follow_ups f WHERE f.client_id = c.id AND f.status IN ('OPEN', 'IN_PROGRESS') AND f.due_at < NOW())
 - 5 * (SELECT COUNT(*) FROM release_impacts ri JOIN releases r ON r.id = ri.release_id WHERE ri.client_id = c.id AND r.status = 'PUBLISHED' AND NOT EXISTS (SELECT 1 FROM release_documentations rd JOIN documentations d ON d.id = rd.documentation_id WHERE rd.release_id = ri.release_id AND d.status = 'PUBLISHED'))`
	healthByClient := health.Select("CASE WHEN (" + score + ") >= 80 THEN 'HEALTHY' WHEN (" + score + ") >= 60 THEN 'ATTENTION' ELSE 'AT_RISK' END AS name")
	if err := s.db.Table("(?) AS client_health", healthByClient).Select("name, COUNT(*) AS count").Group("name").Order("name").Scan(&out.ClientHealth).Error; err != nil {
		return out, err
	}
	if raw, err := json.Marshal(out); err == nil {
		s.cache.Set(key, string(raw), 30*time.Second)
	}
	return out, nil
}

func slaBreachedSQL() string {
	return "EXISTS (SELECT 1 FROM sla_policies sp WHERE sp.severity = i.severity AND sp.is_active AND COALESCE(i.resolved_at, NOW()) > i.reported_at + sp.resolution_minutes * INTERVAL '1 minute')"
}

const timelineEvents = `
SELECT i.id, 'ISSUE_REPORTED' AS type, 'Issue ' || i.issue_number || ' reported' AS title, i.id AS resource_id, 'issue' AS resource_type, i.reported_at AS occurred_at FROM issues i WHERE i.client_id = ?
UNION ALL SELECT h.id, 'ISSUE_STATUS_CHANGED', 'Issue status changed to ' || h.to_status, h.issue_id, 'issue', h.created_at FROM issue_status_histories h JOIN issues i ON i.id = h.issue_id WHERE i.client_id = ?
UNION ALL SELECT ri.id, 'RELEASE_IMPACT_IDENTIFIED', 'Release impact identified', ri.release_id, 'release', ri.created_at FROM release_impacts ri WHERE ri.client_id = ?
UNION ALL SELECT h.id, 'HANDOFF_CREATED', 'Operational handoff created', h.id, 'handoff', h.created_at FROM operational_handoffs h WHERE h.client_id = ?
UNION ALL SELECT h.id, 'HANDOFF_ACKNOWLEDGED', 'Operational handoff acknowledged', h.id, 'handoff', h.acknowledged_at FROM operational_handoffs h WHERE h.client_id = ? AND h.acknowledged_at IS NOT NULL
UNION ALL SELECT h.id, 'HANDOFF_COMPLETED', 'Operational handoff completed', h.id, 'handoff', h.completed_at FROM operational_handoffs h WHERE h.client_id = ? AND h.completed_at IS NOT NULL
UNION ALL SELECT f.id, 'FOLLOW_UP_CREATED', 'Client follow-up created', f.id, 'follow_up', f.created_at FROM client_follow_ups f WHERE f.client_id = ?
UNION ALL SELECT f.id, 'FOLLOW_UP_COMPLETED', 'Client follow-up completed', f.id, 'follow_up', f.completed_at FROM client_follow_ups f WHERE f.client_id = ? AND f.completed_at IS NOT NULL`

func (s *Service) Timeline(clientID, userID string, scoped bool, in TimelineInput) ([]TimelineEvent, int64, error) {
	client := scope(s.db.Table("clients c").Where("c.id = ? AND c.archived_at IS NULL", clientID), "c", userID, scoped)
	var exists bool
	if err := client.Select("COUNT(*) > 0").Scan(&exists).Error; err != nil {
		return nil, 0, err
	}
	if !exists {
		return nil, 0, ErrNotFound
	}
	args := []interface{}{clientID, clientID, clientID, clientID, clientID, clientID, clientID, clientID}
	q := s.db.Table("("+timelineEvents+") events", args...)
	if in.Type != "" {
		q = q.Where("type = ?", in.Type)
	}
	if in.From != nil {
		q = q.Where("occurred_at >= ?", *in.From)
	}
	if in.To != nil {
		q = q.Where("occurred_at <= ?", *in.To)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var events []TimelineEvent
	err := q.Order("occurred_at DESC").Offset((in.Page - 1) * in.Limit).Limit(in.Limit).Scan(&events).Error
	return events, total, err
}
