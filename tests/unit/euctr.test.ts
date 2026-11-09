import { describe, expect, it } from "vitest";
import { parseEuCtr } from "@/lib/sources/adapters/euctr";

const html = `
<div class="results"><table class="result">
  <tr><td><input type="checkbox" name="enchx" value="2022-003868-25"/><span class="label">EudraCT Number:</span> 2022-003868-25</td>
  <td><span class="label">Start Date<span class="info-tip startdatetip">*</span>:</span> 2024-04-22</td></tr>
  <tr class="even"><td colspan="3"><span class="label">Sponsor Name:</span>Instituto Butantan</td></tr>
  <tr><td colspan="3"><span class="label">Full Title:</span> A phase III dengue vaccine trial</td></tr>
  <tr class="even"><td colspan="3"><span class="label">Medical condition:</span> Dengue</td></tr>
  <tr><td colspan="3"><span class="label">Population Age:</span> Adults</td></tr>
  <tr><td colspan="3"><a href="/ctr-search/trial/2022-003868-25/3rd">Trial protocol</a></td></tr>
</table></div>`;

describe("parseEuCtr", () => {
  it("maps a EudraCT result row to a report record", () => {
    const [paper] = parseEuCtr(html);
    expect(paper).toMatchObject({
      title: "A phase III dengue vaccine trial",
      year: 2024,
      venue: "EU Clinical Trials Register",
      type: "report",
      keywords: ["Dengue"],
      url: "https://www.clinicaltrialsregister.eu/ctr-search/trial/2022-003868-25/3rd",
      sources: ["euctr"],
    });
    expect(paper.abstract).toContain("Conditions: Dengue");
    expect(paper.abstract).toContain("Sponsor: Instituto Butantan");
  });
});
