import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("CISA KEV", () => {
  it("filters the feed by keyword and maps the record", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          vulnerabilities: [
            {
              cveID: "CVE-2024-2222",
              vendorProject: "Acme",
              product: "Router",
              vulnerabilityName: "Acme Router command injection",
              dateAdded: "2024-03-04",
              shortDescription: "An attacker can run commands on the router.",
              knownRansomwareCampaignUse: "Known",
            },
            {
              cveID: "CVE-2024-3333",
              vendorProject: "Other",
              product: "Printer",
              vulnerabilityName: "Unrelated",
              dateAdded: "2024-03-04",
              shortDescription: "Printer issue.",
            },
          ],
        })
      )
    );
    const { searchCisaKev } = await import("@/lib/sources/adapters/cisa-kev");
    const out = await searchCisaKev("router", { perSource: 5 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "CVE-2024-2222: Acme Router command injection",
      year: 2024,
      venue: "CISA KEV Catalog",
      url: "https://nvd.nist.gov/vuln/detail/CVE-2024-2222",
    });
    expect(out[0].keywords).toContain("ransomware");
  });
});
