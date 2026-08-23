CREATE INDEX audit_logs_actor_created_idx ON audit_logs(actor_id, created_at DESC);
CREATE INDEX audit_logs_action_created_idx ON audit_logs(action, created_at DESC);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);
