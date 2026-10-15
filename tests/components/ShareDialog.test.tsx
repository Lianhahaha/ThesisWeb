// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ShareDialog } from "@/components/ShareDialog";
import type { SavedPaper } from "@/lib/types";

const m = vi.hoisted(() => ({
  auth: { user: null as { uid: string; displayName: string | null; email: string } | null },
  listMyShares: vi.fn(async () => []),
}));
vi.mock("@/lib/auth/store", () => ({ useAuth: () => m.auth }));
vi.mock("@/lib/library/share", () => ({
  listMyShares: m.listMyShares,
  publishShare: vi.fn(),
  deleteShare: vi.fn(),
  shareUrl: (id: string) => `https://thesisweb.test/shared/${id}`,
}));
vi.mock("@/lib/auth/username-cache", () => ({ getCachedUsername: () => "Ana" }));

afterEach(cleanup);

const papers = Array.from({ length: 3 }, (_, i): SavedPaper => ({
  id: `p${i}`, title: `Paper ${i}`, authors: [], year: 2024, sources: ["openalex"], savedAt: 1, tags: [], readingStatus: "to-read",
}));

describe("ShareDialog", () => {
  it("asks a signed-out student to sign in first", () => {
    m.auth = { user: null };
    render(<ShareDialog papers={papers} defaultName="" onClose={() => {}} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create link" })).toBeNull();
  });

  it("offers a named link for the papers on screen when signed in", async () => {
    m.auth = { user: { uid: "u1", displayName: null, email: "ana@example.com" } };
    render(<ShareDialog papers={papers} defaultName="Chapter 2" onClose={() => {}} />);
    expect((screen.getByLabelText("Name your group mates will see") as HTMLInputElement).value).toBe("Chapter 2");
    expect(screen.getByText(/these 3 papers/)).toBeTruthy();
    await waitFor(() => expect(m.listMyShares).toHaveBeenCalledWith("u1"));
    expect(screen.getByRole("button", { name: "Create link" })).toBeTruthy();
  });
});
