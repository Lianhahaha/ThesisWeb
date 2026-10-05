import { describe, expect, it } from "vitest";
import { englishPart } from "@/lib/sources/adapters/thaijo";

describe("englishPart", () => {
  it("keeps English text as it is", () => {
    expect(englishPart("The Impacts of Social Media on Adolescents")).toBe("The Impacts of Social Media on Adolescents");
  });

  it("takes the bracketed English from a Thai title or name", () => {
    expect(englishPart("การรู้เท่าทันสื่อสังคมออนไลน์ของวัยรุ่นไทย (Social media literacy of Thai adolescents)")).toBe(
      "Social media literacy of Thai adolescents"
    );
    expect(englishPart("พัชราภา เอื้ออมรวนิช (Patcharapa Euamornvanich)")).toBe("Patcharapa Euamornvanich");
  });

  it("takes the English that follows a Thai abstract", () => {
    expect(englishPart("งานวิจัยเรื่องนี้มีวัตถุประสงค์   The objectives of this research are to study media use.", 20)).toBe(
      "The objectives of this research are to study media use."
    );
  });

  it("returns null when there is no English part", () => {
    expect(englishPart("ผลกระทบของสื่อสังคมที่มีต่อวัยรุ่น")).toBeNull();
    expect(englishPart(undefined)).toBeNull();
  });
});
