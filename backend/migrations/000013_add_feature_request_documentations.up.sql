CREATE TABLE feature_request_documentations (
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    documentation_id UUID NOT NULL REFERENCES documentations(id) ON DELETE CASCADE,
    PRIMARY KEY (feature_request_id, documentation_id)
);

CREATE INDEX feature_request_documentations_documentation_idx ON feature_request_documentations(documentation_id);
