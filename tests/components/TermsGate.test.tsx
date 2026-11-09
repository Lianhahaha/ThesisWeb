// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TermsGate } from "@/components/TermsGate";
import { LEGAL_UPDATED } from "@/lib/legal";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("TermsGate", () => {
  it("shows the terms and keeps accept disabled until the box is checked", async () => {
    render(<TermsGate />);
    expect(screen.getByRole("dialog", { name: "Before you continue" })).toBeTruthy();
    const accept = screen.getByRole("button", { name: /accept and continue/i }) as HTMLButtonElement;
    expect(accept.disabled).toBe(true);

    await userEvent.click(screen.getByRole("checkbox"));
    expect(accept.disabled).toBe(false);

    await userEvent.click(accept);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("tw-terms-accepted")).toBe(LEGAL_UPDATED);
  });

  it("stays out of the way once the current terms are accepted", () => {
    localStorage.setItem("tw-terms-accepted", LEGAL_UPDATED);
    render(<TermsGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
