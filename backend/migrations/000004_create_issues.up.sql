CREATE SEQUENCE issue_number_sequence;

CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_number VARCHAR(50) NOT NULL UNIQUE DEFAULT ('ISS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('issue_number_sequence')::text, 6, '0')),
    client_id UUID NOT NULL REFERENCES clients(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'TRIAGED', 'INVESTIGATING', 'IN_DEVELOPMENT', 'QA', 'RELEASED', 'FOLLOW_UP', 'CLOSED', 'CANCELLED', 'REOPENED')),
    reporter_id UUID NOT NULL REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    release_id UUID,
    resolution_summary TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triaged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issue_status_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    before_data JSONB,
    after_data JSONB,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX issues_list_idx ON issues(status, severity, client_id, reported_at DESC);
CREATE INDEX issues_assignee_idx ON issues(assignee_id, status);
CREATE INDEX issue_status_histories_issue_idx ON issue_status_histories(issue_id, created_at);
CREATE INDEX audit_logs_resource_idx ON audit_logs(resource_type, resource_id, created_at);
