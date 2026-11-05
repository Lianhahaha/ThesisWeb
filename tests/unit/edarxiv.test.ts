import { afterEach, describe, expect, it, vi } from "vitest";
import { searchEdArxiv } from "@/lib/sources/adapters/osf";

const response = {
  included: [
    {
      type: "index-card",
      attributes: {
        resourceMetadata: {
          "@id": "https://osf.io/preprints/edarxiv/abc",
          title: [{ "@value": "Teaching mathematics through problem solving" }],
          creator: [{ name: [{ "@value": "Maria Santos" }] }],
          dateCreated: [{ "@value": "2025-03-01" }],
          description: [{ "@value": "A study of classroom practice." }],
          identifier: [{ "@value": "https://doi.org/10.35542/osf.io/abc" }],
          publisher: [{ name: [{ "@value": "EdArXiv" }] }],
        },
      },
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("searchEdArxiv", () => {
  it("asks SHARE for EdArXiv only and marks the record as a preprint", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const papers = await searchEdArxiv("problem solving", { perSource: 5 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("cardSearchFilter%5Bpublisher%5D=https%3A%2F%2Fosf.io%2Fpreprints%2Fedarxiv");
    expect(papers[0]).toMatchObject({
      title: "Teaching mathematics through problem solving",
      year: 2025,
      doi: "10.35542/osf.io/abc",
      preprint: true,
      sources: ["edarxiv"],
    });
  });
});
