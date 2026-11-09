import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCourtListener, searchCourtListener } from "@/lib/sources/adapters/courtlistener";

const data = {
  results: [
    {
      caseName: "Council for Opportunity in Education v. U.S. Department of Education",
      caseNameFull: "Council for Opportunity in Education v. U.S. Department of Education",
      citation: ["101 F.4th 123"],
      court: "Court of Appeals for the D.C. Circuit",
      dateFiled: "2024-05-10",
      absolute_url: "/opinion/123/council-v-education/",
      status: "Published",
    },
  ],
};

const originalToken = process.env.COURTLISTENER_API_TOKEN;
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken == null) delete process.env.COURTLISTENER_API_TOKEN;
  else process.env.COURTLISTENER_API_TOKEN = originalToken;
});

describe("parseCourtListener", () => {
  it("maps a court opinion", () => {
    const [paper] = parseCourtListener(data);
    expect(paper).toMatchObject({
      title: "Council for Opportunity in Education v. U.S. Department of Education",
      year: 2024,
      venue: "Court of Appeals for the D.C. Circuit",
      type: "other",
      url: "https://www.courtlistener.com/opinion/123/council-v-education/",
      sources: ["courtlistener"],
    });
    expect(paper.abstract).toContain("101 F.4th 123");
  });
});

describe("searchCourtListener", () => {
  it("returns nothing without a token", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    await expect(searchCourtListener("education")).resolves.toEqual([]);
  });
});
