// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaperCard } from "@/components/PaperCard";
import type { Paper } from "@/lib/types";

// The Save button talks to IndexedDB and Firebase; it has its own tests.
vi.mock("@/components/SaveButton", () => ({ SaveButton: () => <button>Save</button> }));

afterEach(cleanup);

const paper = (over: Partial<Paper> = {}): Paper => ({
  id: "doi:10.1/x",
  title: "Teacher burnout in public schools",
  authors: ["Ana Cruz", "Jose Reyes", "Maria Santos", "Liza Mendoza"],
  year: 2023,
  venue: "Philippine Journal of Education",
  doi: "10.1/x",
  sources: ["openalex"],
  ...over,
});

describe("PaperCard", () => {
  it("shows title, the first three authors, year and venue, and links to the paper page", () => {
    render(<PaperCard paper={paper()} />);
    const link = screen.getByRole("link", { name: "Teacher burnout in public schools" });
    expect(link.getAttribute("href")).toBe("/paper/doi%3A10.1%2Fx");
    expect(screen.getByText(/Ana Cruz, Jose Reyes, Maria Santos et al\./)).toBeTruthy();
    expect(screen.getByText("Philippine Journal of Education")).toBeTruthy();
  });

  it("warns about retractions, concerns and preprints", () => {
    render(<PaperCard paper={paper({ retracted: true, preprint: true })} />);
    expect(screen.getByText("Retracted")).toBeTruthy();
    expect(screen.getByText("Preprint · not peer-reviewed")).toBeTruthy();
    cleanup();
    render(<PaperCard paper={paper({ concern: true })} />);
    expect(screen.getByText("Expression of concern")).toBeTruthy();
  });

  it("offers the free copy and the DOI, or the record page when there is no DOI", () => {
    render(<PaperCard paper={paper({ isOpenAccess: true, openAccessUrl: "https://x.org/a.pdf" })} />);
    expect(screen.getByRole("link", { name: /Free PDF/ }).getAttribute("href")).toBe("https://x.org/a.pdf");
    expect(screen.getByRole("link", { name: /DOI/ }).getAttribute("href")).toBe("https://doi.org/10.1/x");
    cleanup();
    render(<PaperCard paper={paper({ doi: null, url: "https://repo.edu.ph/1" })} />);
    expect(screen.getByRole("link", { name: /Record/ }).getAttribute("href")).toBe("https://repo.edu.ph/1");
  });

  it("labels an AI summary as one, and marks a paper new in a saved search", () => {
    render(<PaperCard paper={paper({ tldr: "Burnout is common." })} isNew />);
    expect(screen.getByText(/AI summary/)).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
  });
});
