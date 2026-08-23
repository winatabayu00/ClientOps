import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toaster, toast } from "./toast";

describe("toast", () => {
  it("shows a success toast and dismisses it", () => {
    render(<Toaster />);
    act(() => {
      toast.success("Saved OK");
    });
    expect(screen.getByText("Saved OK")).toBeInTheDocument();
    act(() => {
      screen.getByRole("button", { name: "Dismiss" }).click();
    });
    expect(screen.queryByText("Saved OK")).not.toBeInTheDocument();
  });

  it("renders error kind", () => {
    render(<Toaster />);
    act(() => {
      toast.error("Boom 42");
    });
    expect(screen.getByText("Boom 42")).toBeInTheDocument();
  });
});
