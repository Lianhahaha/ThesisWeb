import { describe, expect, it } from "vitest";
import { parsePcaarrdDetail, parsePcaarrdList } from "@/lib/sources/adapters/pcaarrd";

const list = `
  <div class="col-md-4">
    <div class="box_list">
      <h5>Agro-Morphological characterization and selection of second generation mutant lines in pigmented rice...</h5>
      <b>Source : </b> Central Luzon State University (CLSU)<br/>
      <a href="https://elibrary.pcaarrd.dost.gov.ph/claarrdec/full-description/1197" class="btn_1">Full description</a>
    </div>
  </div>`;

describe("parsePcaarrdList", () => {
  it("reads the record link, title and source", () => {
    expect(parsePcaarrdList(list)).toEqual([
      {
        id: "1197",
        url: "https://elibrary.pcaarrd.dost.gov.ph/claarrdec/full-description/1197",
        title:
          "Agro-Morphological characterization and selection of second generation mutant lines in pigmented rice...",
        source: "Central Luzon State University (CLSU)",
      },
    ]);
  });
});

describe("parsePcaarrdDetail", () => {
  it("reads the full title, authors, year, type, publisher and summary", () => {
    const detail = `
      <h5>Agro-Morphological characterization and selection of second generation mutant lines in pigmented rice (Oryza sativa L.) "Pinilisa" /</h5>
      <small>c2016.</small>
      <button>SUMMARY</button>
      <div class="wrapper_indent">Therefore, the Crop Science Mutant "Pinilisa" was the earliest to flower.</div>
      <div class="row"><div class="col mb-2"><strong>Material Type </strong></div><div class="col text-center"> Thesis/Dissertations </div></div>
      <div class="row"><div class="col mb-2"><strong>Authors </strong></div><div class="col text-center"> Banao, Marvin Gajes, </div></div>
      <div class="row"><div class="col mb-2"><strong>Publisher </strong></div><div class="col text-center"> Central Luzon State University </div></div>`;

    expect(
      parsePcaarrdDetail(detail, {
        id: "1197",
        url: "https://elibrary.pcaarrd.dost.gov.ph/claarrdec/full-description/1197",
        title: "short title",
        source: "Central Luzon State University (CLSU)",
      })
    ).toMatchObject({
      title:
        'Agro-Morphological characterization and selection of second generation mutant lines in pigmented rice (Oryza sativa L.) "Pinilisa"',
      authors: ["Marvin Gajes Banao"],
      year: 2016,
      type: "thesis",
      publisher: "Central Luzon State University",
      abstract: 'Therefore, the Crop Science Mutant "Pinilisa" was the earliest to flower.',
      isOpenAccess: false,
      sources: ["pcaarrd"],
    });
  });
});
