CREATE TABLE sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL UNIQUE CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    resolution_minutes INTEGER NOT NULL CHECK (resolution_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sla_policies (severity, resolution_minutes) VALUES
    ('LOW', 7200), ('MEDIUM', 4320), ('HIGH', 1440), ('CRITICAL', 240);

CREATE TABLE issue_work_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id),
    state VARCHAR(30) NOT NULL CHECK (state IN ('ACTIVE', 'WAITING_CLIENT', 'WAITING_OPS', 'WAITING_PRODUCT', 'WAITING_ENGINEERING', 'WAITING_RELEASE', 'BLOCKED')),
    reason TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX issue_work_states_current_idx ON issue_work_states(issue_id) WHERE ended_at IS NULL;
CREATE INDEX issue_work_states_history_idx ON issue_work_states(issue_id, started_at);

INSERT INTO issue_work_states (issue_id, state, started_at, created_by)
SELECT id, 'ACTIVE', created_at, reporter_id FROM issues;
