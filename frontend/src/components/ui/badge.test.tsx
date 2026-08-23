import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthBadge, SeverityBadge, StatusBadge } from "./badge";

describe("StatusBadge", () => {
  it("renders status with readable text", () => {
    render(<StatusBadge status="IN_DEVELOPMENT" />);
    expect(screen.getByText("IN DEVELOPMENT")).toBeInTheDocument();
  });
});

describe("SeverityBadge", () => {
  it("renders the severity verbatim", () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });
});

describe("HealthBadge", () => {
  it("renders classification and score", () => {
    render(<HealthBadge classification="HEALTHY" score={86} />);
    expect(screen.getByText(/HEALTHY 86\/100/)).toBeInTheDocument();
  });
});
