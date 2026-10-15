// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SaveButton } from "@/components/SaveButton";
import type { Paper } from "@/lib/types";

const m = vi.hoisted(() => ({
  savePaper: vi.fn(async () => {}),
  unsavePaper: vi.fn(async () => {}),
  toast: vi.fn(),
  request: vi.fn(),
  auth: { user: null as { uid: string } | null, initialized: true },
  local: false as boolean | undefined,
  saved: { uid: "u1", saved: {} as Record<string, boolean> },
}));
vi.mock("@/lib/library/store", () => ({ getDb: () => ({}), savePaper: m.savePaper, unsavePaper: m.unsavePaper }));
vi.mock("@/lib/auth/store", () => ({ useAuth: () => m.auth }));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => m.local }));
vi.mock("@/lib/library/saved-ids", () => ({
  requestSavedState: m.request,
  useSavedState: (pick: (s: typeof m.saved) => unknown) => pick(m.saved),
}));
vi.mock("@/components/Toaster", () => ({ toast: m.toast }));

const paper: Paper = { id: "doi:10.1/x", title: "T", authors: [], year: 2024, sources: ["openalex"] };

beforeEach(() => {
  vi.clearAllMocks();
  m.auth = { user: null, initialized: true };
  m.local = false;
  m.saved = { uid: "u1", saved: {} };
});
afterEach(cleanup);

describe("SaveButton signed out (this browser)", () => {
  it("saves a paper as a library record", async () => {
    render(<SaveButton paper={paper} />);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(m.savePaper).toHaveBeenCalledTimes(1));
    expect(m.savePaper).toHaveBeenCalledWith(expect.objectContaining({ id: paper.id, tags: [], readingStatus: "to-read", savedAt: expect.any(Number) }));
    expect(m.toast).toHaveBeenCalledWith("Saved to library", "success");
  });

  it("removes a saved paper", async () => {
    m.local = true;
    render(<SaveButton paper={paper} />);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Saved/ }));
    await waitFor(() => expect(m.unsavePaper).toHaveBeenCalledWith(paper.id));
  });

  it("waits until it knows, and says so when a save fails", async () => {
    m.local = undefined;
    render(<SaveButton paper={paper} />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    m.local = false;
    m.savePaper.mockRejectedValueOnce(new Error("offline"));
    render(<SaveButton paper={paper} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(m.toast).toHaveBeenCalledWith("Could not update your library. Try again.", "error"));
  });
});

describe("SaveButton signed in (account)", () => {
  it("asks the shared lookup, and stays disabled until it answers", () => {
    m.auth = { user: { uid: "u1" }, initialized: true };
    render(<SaveButton paper={paper} />);
    expect(m.request).toHaveBeenCalledWith("u1", paper.id);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the answer from the lookup", () => {
    m.auth = { user: { uid: "u1" }, initialized: true };
    m.saved = { uid: "u1", saved: { [paper.id]: true } };
    render(<SaveButton paper={paper} />);
    expect(screen.getByRole("button", { name: /Saved/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
