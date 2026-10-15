// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SynthesisMatrix } from "@/components/SynthesisMatrix";
import type { SavedPaper } from "@/lib/types";

const m = vi.hoisted(() => ({ updatePaper: vi.fn(async () => {}), toast: vi.fn() }));
vi.mock("@/lib/library/store", () => ({ updatePaper: m.updatePaper }));
vi.mock("@/components/Toaster", () => ({ toast: m.toast }));

const paper: SavedPaper = {
  id: "doi:10.1/x",
  title: "Teacher burnout",
  authors: ["Ana Cruz"],
  year: 2023,
  sources: ["openalex"],
  savedAt: 1,
  tags: [],
  readingStatus: "to-read",
  matrix: { findings: "Burnout is high" },
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

// Phone cards and the desktop table both render; the table's cells have "<column> for <title>" labels.
const cell = (label: string) => screen.getByLabelText(`${label} for Teacher burnout`) as HTMLTextAreaElement;

describe("SynthesisMatrix", () => {
  it("shows saved cells and the four columns", () => {
    render(<SynthesisMatrix papers={[paper]} />);
    expect(cell("Findings").value).toBe("Burnout is high");
    for (const label of ["Method", "Limitations", "Relevance to my topic"]) expect(cell(label).value).toBe("");
  });

  it("saves only the cell that changed, when it loses focus", async () => {
    render(<SynthesisMatrix papers={[paper]} />);
    fireEvent.change(cell("Method"), { target: { value: "Survey of 200 teachers" } });
    expect(m.updatePaper).not.toHaveBeenCalled();
    fireEvent.blur(cell("Method"));
    await waitFor(() => expect(m.updatePaper).toHaveBeenCalledWith(paper.id, { "matrix.method": "Survey of 200 teachers" }));
  });

  it("does nothing on a blur without a change, and warns when a save fails", async () => {
    render(<SynthesisMatrix papers={[paper]} />);
    fireEvent.blur(cell("Limitations"));
    expect(m.updatePaper).not.toHaveBeenCalled();
    m.updatePaper.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(cell("Limitations"), { target: { value: "One school" } });
    fireEvent.blur(cell("Limitations"));
    await waitFor(() => expect(m.toast).toHaveBeenCalledWith(expect.stringContaining("Could not save “Limitations”"), "error"));
  });

  it("explains itself when there is nothing to fill in", () => {
    render(<SynthesisMatrix papers={[]} />);
    expect(screen.getByText("Nothing to synthesise yet")).toBeTruthy();
  });
});
