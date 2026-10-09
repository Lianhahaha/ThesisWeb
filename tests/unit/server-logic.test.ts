import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { dedupePapers, scoreRelevance } from "@/lib/server/dedupe";
import { extractDoi } from "@/lib/text";
import { rateLimit } from "@/lib/server/rate-limit";
import type { Paper } from "@/lib/types";

const paper = (over: Partial<Paper>): Paper => ({
  id: "a",
  title: "Teacher burnout in public schools",
  authors: [],
  year: 2024,
  sources: ["s"],
  ...over,
});

describe("extractDoi", () => {
  const sici = "10.1002/(SICI)1097-4679(199711)53:7<657::AID-JCLP4>3.0.CO;2-F";

  it("keeps < and > in a line that is only a DOI", () => {
    expect(extractDoi(sici)).toBe(sici);
    expect(extractDoi(`https://doi.org/${encodeURIComponent(sici).replace(/%2F/g, "/")}`)).toBe(sici);
    expect(extractDoi(`doi: ${sici}`)).toBe(sici);
  });

  it("still finds a DOI inside other text and drops trailing punctuation", () => {
    expect(extractDoi("See (https://doi.org/10.1234/abc.5).")).toBe("10.1234/abc.5");
    expect(extractDoi("10.1234/abc.")).toBe("10.1234/abc");
    expect(extractDoi("no doi here")).toBeNull();
  });
});

describe("scoreRelevance", () => {
  it("does not push a borderline uncited paper out because a famous one is in the set", () => {
    const borderline = paper({ id: "x", title: "Public schools funding", year: 2015 });
    const classic = paper({ id: "y", title: "Teacher burnout in public schools", year: 2015, citedByCount: 20000 });
    const ids = scoreRelevance([borderline, classic], "teacher burnout public schools").map((p) => p.id);
    expect(ids).toEqual(["y", "x"]);
  });
});

describe("dedupePapers", () => {
  it("prefers a free copy from any source over a record with none", () => {
    const [merged] = dedupePapers([
      paper({ doi: "10.1/a", isOpenAccess: false, openAccessUrl: "https://publisher.com/paywall", sources: ["openalex"] }),
      paper({ doi: "10.1/a", isOpenAccess: true, openAccessUrl: "https://repo.org/a.pdf", sources: ["core"] }),
    ]);
    expect(merged).toMatchObject({ isOpenAccess: true, openAccessUrl: "https://repo.org/a.pdf" });
  });
});

describe("rateLimit", () => {
  const req = (ip: string) => new NextRequest("http://localhost/api/cite", { headers: { "x-forwarded-for": ip } });

  it("allows up to the limit per address, then answers 429 with Retry-After", () => {
    for (let i = 0; i < 10; i++) expect(rateLimit(req("203.0.113.1"), "cite")).toBeNull();
    const refused = rateLimit(req("203.0.113.1"), "cite");
    expect(refused?.status).toBe(429);
    expect(Number(refused?.headers.get("Retry-After"))).toBeGreaterThan(0);
    // Another address is counted separately.
    expect(rateLimit(req("203.0.113.2"), "cite")).toBeNull();
  });
});
