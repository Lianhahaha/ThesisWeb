import { afterEach, describe, expect, it, vi } from "vitest";
import { searchHuggingFace } from "@/lib/sources/adapters/huggingface";

const response = [
  {
    paper: {
      id: "2509.26495",
      title: "A Large Language Model Study",
      authors: [{ name: "Ana Cruz" }, { name: "Lian Cruz" }],
      publishedAt: "2025-09-30T16:39:17.000Z",
      summary: "An AI-generated summary.",
    },
  },
];

afterEach(() => vi.unstubAllGlobals());

describe("searchHuggingFace", () => {
  it("maps an AI paper and links to its free arXiv copy", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const [paper] = await searchHuggingFace("large language models", { perSource: 5 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("limit=10");
    expect(paper).toMatchObject({
      title: "A Large Language Model Study",
      authors: ["Ana Cruz", "Lian Cruz"],
      year: 2025,
      type: "preprint",
      preprint: true,
      isOpenAccess: true,
      openAccessUrl: "https://arxiv.org/pdf/2509.26495.pdf",
      sources: ["huggingface"],
    });
  });
});
