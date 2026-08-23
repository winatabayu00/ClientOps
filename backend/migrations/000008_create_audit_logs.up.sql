CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id), action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, resource_id UUID,
    before_data JSONB, after_data JSONB, request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id, created_at DESC);
