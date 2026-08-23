import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("renders title/body and fires confirm", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <Dialog
        title="Archive client?"
        open
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="Archive"
      >
        Body text
      </Dialog>,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Archive client?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("fires onClose when cancel clicked", async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="T" open onClose={onClose}>
        Body
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog title="T" open={false} onClose={() => {}}>
        Body
      </Dialog>,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
