DROP TABLE IF EXISTS client_follow_ups;
DROP TABLE IF EXISTS operational_handoffs;
DROP TABLE IF EXISTS release_impacts;
DROP TABLE IF EXISTS release_item_issues;
DROP TABLE IF EXISTS release_items;
DROP TABLE IF EXISTS release_documentations;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_release_id_fkey;
DROP TABLE IF EXISTS releases;
DROP TABLE IF EXISTS documentations;
