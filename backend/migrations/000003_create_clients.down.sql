DROP TRIGGER active_client_owner_on_owner ON client_owners;
DROP TRIGGER active_client_owner_on_client ON clients;
DROP FUNCTION enforce_active_client_owner();
DROP TABLE client_owners;
DROP TABLE client_contacts;
DROP TABLE clients;
