CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_read_idx ON notifications(user_id, read_at);
CREATE INDEX notifications_user_created_idx ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX notifications_follow_up_overdue_once_idx ON notifications(user_id, type, entity_id) WHERE type = 'FOLLOW_UP_OVERDUE';
