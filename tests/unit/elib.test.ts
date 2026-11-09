import { describe, expect, it } from "vitest";
import { parseElibDetail, parseElibList } from "@/lib/sources/adapters/elib";

const list = `
<td style="vertical-align: top" class="sectiondata"><a title="Click to view record details" href="details.php?uid=abc">Transformative education</a>.<br /><br />Manila: IBON Books, 2004.<br /><br />Subject: <a href="x">Education -- Gender perspective</a>; <a href="y">Education -- Globalization</a>.<br /><br /></td>`;

const detail = `
<span title="">Title Statement</span></td><td colspan="2" class="tddata">Transformative education / Antonio Tujan, Jr., editor</td>
<span title="">General Information</span></td><td colspan="2" class="tddata">050614s2004 ph |||| ||||c|eng</td>
<span title="">Added Entry - Personal Name</span></td><td colspan="2" class="tddata"><a href="x">Tujan, Antonio,Jr.</a>, ed.</td>
<span title="">Textual Physical Form Designator</span></td><td colspan="2" class="tddata">Books</td>`;

describe("Philippine eLib parsing", () => {
  it("reads the brief-record list", () => {
    const [row] = parseElibList(list);
    expect(row).toMatchObject({
      uid: "details.php?uid=abc",
      title: "Transformative education",
      imprint: "Manila: IBON Books, 2004.",
      subjects: ["Education -- Gender perspective", "Education -- Globalization"],
    });
  });

  it("reads authors, type and year from the MARC detail page", () => {
    expect(parseElibDetail(detail)).toMatchObject({
      authors: ["Tujan, Antonio,Jr."],
      type: "book",
      year: 2004,
    });
  });
});
