CREATE UNIQUE INDEX notifications_release_published_once_idx ON notifications(user_id, type, entity_id) WHERE type = 'RELEASE_PUBLISHED';
CREATE UNIQUE INDEX notifications_sla_approaching_once_idx ON notifications(user_id, type, entity_id) WHERE type = 'SLA_APPROACHING';
