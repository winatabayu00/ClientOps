CREATE SEQUENCE feature_request_number_sequence;

CREATE TABLE feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) NOT NULL UNIQUE DEFAULT ('FR-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('feature_request_number_sequence')::text, 6, '0')),
    title VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PLANNED', 'IN_DEVELOPMENT', 'RELEASED', 'DELIVERED', 'REJECTED', 'DUPLICATE', 'CANCELLED')),
    priority VARCHAR(20),
    product_owner_id UUID REFERENCES users(id),
    rejection_reason TEXT,
    duplicate_of_id UUID REFERENCES feature_requests(id),
    first_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((status <> 'REJECTED') OR rejection_reason IS NOT NULL),
    CHECK ((status <> 'DUPLICATE') OR duplicate_of_id IS NOT NULL),
    CHECK (duplicate_of_id IS NULL OR duplicate_of_id <> id)
);

CREATE TABLE feature_request_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(feature_request_id, client_id)
);

CREATE INDEX feature_requests_list_idx ON feature_requests(status, priority, first_requested_at);
CREATE INDEX feature_request_clients_client_idx ON feature_request_clients(client_id, feature_request_id);
