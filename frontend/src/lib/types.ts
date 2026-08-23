export type Item = Record<string, unknown> & {
  id: string;
  version?: number;
  title?: string;
  name?: string;
  status?: string;
  code?: string;
  issue_number?: string;
};

export type Health = {
  score: number;
  classification: "HEALTHY" | "ATTENTION" | "AT_RISK";
  factors: { code: string; impact: number; description: string }[];
  calculated_at: string;
};

export type Client = Item & {
  code?: string;
  type?: string;
  province?: string;
  city?: string;
  address?: string;
  health?: Health;
};

export type Issue = Item & {
  client_id: string;
  assignee_id?: string;
  release_id?: string;
  description?: string;
  category?: string;
  resolution_summary?: string;
  work_state?: string;
  sla_status?: string;
  sla_deadline?: string;
};

export type Release = Item & { version: string; summary: string; status: string };

export type FeatureRequest = Item & {
  request_number: string;
  problem_statement: string;
  expected_outcome: string;
  priority?: string;
  demand_count?: number;
  oldest_request_at?: string;
  rejection_reason?: string;
};
