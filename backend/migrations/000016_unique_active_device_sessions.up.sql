WITH duplicate_sessions AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, user_agent ORDER BY last_used_at DESC, created_at DESC) AS row_number
    FROM auth_sessions
    WHERE revoked_at IS NULL
)
UPDATE auth_sessions SET revoked_at = NOW()
WHERE id IN (SELECT id FROM duplicate_sessions WHERE row_number > 1);

CREATE UNIQUE INDEX auth_sessions_active_device_idx
    ON auth_sessions(user_id, user_agent)
    WHERE revoked_at IS NULL;
