// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TermsGate } from "@/components/TermsGate";
import { LEGAL_UPDATED } from "@/lib/legal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// jsdom has no layout, so give every element fixed scroll metrics.
function setMetrics(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => scrollHeight });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => clientHeight });
}

beforeEach(() => {
  localStorage.clear();
  setMetrics(1000, 400);
});
afterEach(cleanup);

describe("TermsGate", () => {
  it("shows the documents and keeps the box locked until they are scrolled to the end", async () => {
    render(<TermsGate />);
    expect(screen.getByRole("dialog", { name: "Before you continue" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeTruthy();

    expect(screen.getByText("Section 1 of 2")).toBeTruthy();
    expect(screen.getByText("Section 2 of 2")).toBeTruthy();
    expect(screen.getByText(/scroll to the end to continue/i)).toBeTruthy();
    expect(screen.queryByText(/unlocked/i)).toBeNull();

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    const accept = screen.getByRole("button", { name: /accept and continue/i }) as HTMLButtonElement;
    expect(checkbox.disabled).toBe(true);
    expect(accept.disabled).toBe(true);

    const scroller = document.querySelector(".overflow-y-auto") as HTMLElement;
    scroller.scrollTop = 600;
    fireEvent.scroll(scroller);

    expect(checkbox.disabled).toBe(false);
    expect(screen.getByText(/read the terms of use and privacy policy first to proceed/i)).toBeTruthy();
    await userEvent.click(checkbox);
    expect(accept.disabled).toBe(false);

    await userEvent.click(accept);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("tw-terms-accepted")).toBe(LEGAL_UPDATED);
  });

  it("unlocks the box straight away when the text fits without scrolling", () => {
    setMetrics(400, 400);
    render(<TermsGate />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(false);
  });

  it("stays out of the way once the current terms are accepted", () => {
    localStorage.setItem("tw-terms-accepted", LEGAL_UPDATED);
    render(<TermsGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
