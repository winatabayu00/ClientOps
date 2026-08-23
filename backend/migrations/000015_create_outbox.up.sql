CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outbox_events_pending_idx ON outbox_events(available_at, created_at) WHERE processed_at IS NULL;
CREATE UNIQUE INDEX notifications_issue_assigned_once_idx ON notifications(user_id, type, entity_id) WHERE type = 'ISSUE_ASSIGNED';
