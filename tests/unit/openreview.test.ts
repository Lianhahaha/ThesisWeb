import { afterEach, describe, expect, it, vi } from "vitest";
import { searchOpenReview } from "@/lib/sources/adapters/openreview";

const response = {
  notes: [
    {
      id: "accepted1",
      forum: "accepted1",
      pdate: 1_700_000_000_000,
      content: {
        title: "Accepted AI Paper",
        authors: ["Ana Cruz"],
        abstract: "A reviewed paper.",
        venue: "ICLR 2024 poster",
        pdf: "/pdf/accepted1.pdf",
      },
    },
    {
      id: "withdrawn1",
      forum: "withdrawn1",
      content: {
        title: "Withdrawn Paper",
        venue: "Submitted to ICLR 2024",
      },
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("searchOpenReview", () => {
  it("keeps accepted venues and drops submitted or withdrawn entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string) => new Response(JSON.stringify(response), { status: 200 }))
    );

    const papers = await searchOpenReview("large language models", { perSource: 10 });
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      title: "Accepted AI Paper",
      venue: "ICLR 2024 poster",
      type: "conference",
      isOpenAccess: true,
      openAccessUrl: "https://openreview.net/pdf/accepted1.pdf",
      sources: ["openreview"],
    });
  });
});
