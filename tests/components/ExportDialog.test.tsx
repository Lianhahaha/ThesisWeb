// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExportDialog } from "@/components/ExportDialog";
import type { SavedPaper } from "@/lib/types";

vi.mock("@/lib/preferences", () => ({ getPreferences: () => ({ citationStyle: "apa" }) }));

afterEach(cleanup);

const saved = (over: Partial<SavedPaper>): SavedPaper => ({
  id: Math.random().toString(36),
  title: "A study",
  authors: ["Ana Cruz"],
  year: 2023,
  sources: ["openalex"],
  savedAt: 1,
  tags: [],
  readingStatus: "to-read",
  ...over,
});

const papers = [
  saved({ title: "Reading in Iloilo schools", authors: ["Liza Reyes"], scope: "local", venue: "Philippine Journal of Education", type: "article", volume: "4", issue: "2", pages: "1-9" }),
  saved({ title: "Burnout in Japan", authors: ["Ken Abe"], scope: "foreign" }),
];
const list = () => screen.getAllByText((_, el) => el?.tagName === "PRE")[0].textContent ?? "";

describe("ExportDialog", () => {
  it("lists references by surname in the default style, with volume, issue and pages", () => {
    render(<ExportDialog papers={papers} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Export references" })).toBeTruthy();
    const text = list();
    expect(text.indexOf("Abe, K.")).toBeLessThan(text.indexOf("Reyes, L."));
    expect(text).toContain("Philippine Journal of Education, 4(2), 1–9.");
  });

  it("switches style and splits Local from Foreign", () => {
    render(<ExportDialog papers={papers} onClose={() => {}} scopeOf={(p) => p.scope ?? "foreign"} />);
    fireEvent.click(screen.getByRole("button", { name: "MLA 9" }));
    expect(list()).toContain('Reyes, Liza. "Reading in Iloilo Schools."');
    fireEvent.click(screen.getByLabelText("Split into Local and Foreign"));
    const text = list();
    expect(text.startsWith("Local")).toBe(true);
    expect(text.indexOf("Foreign")).toBeGreaterThan(text.indexOf("Reyes"));
  });
});
