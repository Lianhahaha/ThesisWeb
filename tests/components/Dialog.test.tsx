// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "@/components/Dialog";

afterEach(cleanup);

// jsdom has no layout, so offsetParent is null for everything; treat elements as visible.
Object.defineProperty(HTMLElement.prototype, "offsetParent", { get() { return this.parentNode; } });

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Dialog title="Export references" onClose={() => { onClose(); setOpen(false); }}>
          <button>First action</button>
          <button>Last action</button>
        </Dialog>
      )}
    </>
  );
}

describe("Dialog", () => {
  it("is a labelled modal dialog that takes focus and locks the page behind", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Export references" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("keeps Tab and Shift+Tab inside", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 5; i++) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and gives focus back to the opener", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement?.textContent).toBe("Open");
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on a click outside, not inside", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "First action" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
