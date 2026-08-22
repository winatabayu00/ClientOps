CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'VOCATIONAL', 'OTHER')),
    status VARCHAR(30) NOT NULL DEFAULT 'ONBOARDING' CHECK (status IN ('ACTIVE', 'ONBOARDING', 'INACTIVE', 'ARCHIVED')),
    province VARCHAR(150),
    city VARCHAR(150),
    address TEXT,
    subscription_start DATE,
    subscription_end DATE,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    position VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX client_contacts_one_primary_idx ON client_contacts(client_id) WHERE is_primary;

CREATE TABLE client_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    owner_type VARCHAR(30) NOT NULL CHECK (owner_type IN ('PRIMARY', 'SECONDARY', 'TECHNICAL')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX client_owners_one_active_primary_idx ON client_owners(client_id) WHERE owner_type = 'PRIMARY' AND unassigned_at IS NULL;
CREATE INDEX client_owners_active_user_idx ON client_owners(user_id, client_id) WHERE unassigned_at IS NULL;
CREATE INDEX clients_list_idx ON clients(status, name);

CREATE FUNCTION enforce_active_client_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    target_client UUID;
BEGIN
    IF TG_TABLE_NAME = 'clients' THEN
        target_client := COALESCE(NEW.id, OLD.id);
    ELSE
        target_client := COALESCE(NEW.client_id, OLD.client_id);
    END IF;
    IF EXISTS (SELECT 1 FROM clients WHERE id = target_client AND status = 'ACTIVE')
       AND (SELECT COUNT(*) FROM client_owners WHERE client_id = target_client AND owner_type = 'PRIMARY' AND unassigned_at IS NULL) <> 1 THEN
        RAISE EXCEPTION 'active client requires exactly one primary owner' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER active_client_owner_on_client
AFTER INSERT OR UPDATE OF status ON clients DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_active_client_owner();
CREATE CONSTRAINT TRIGGER active_client_owner_on_owner
AFTER INSERT OR UPDATE OR DELETE ON client_owners DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_active_client_owner();
