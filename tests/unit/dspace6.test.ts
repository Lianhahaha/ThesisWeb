import { describe, expect, it } from "vitest";
import { dspace6Abstract } from "@/lib/sources/platforms/dspace6";

describe("dspace6Abstract", () => {
  const title = "Tilapia marketing in Metro Manila";
  const authors = ["Raneses, Benjamin S., Jr."];

  it("drops the title and contributor lines the feed puts before the abstract", () => {
    const summary = [
      title,
      "Raneses, Benjamin S., Jr.",
      "Guerrero, Rafael D., III; de Guzman, Dalisay L.; Lantican, Cecilia M.",
      "The culture of tilapia in the Philippines has spread across the country.",
      "Primary focus is given on the marketing of tilapia in Metro Manila.",
    ].join("\n");
    expect(dspace6Abstract(summary, title, authors)).toBe(
      "The culture of tilapia in the Philippines has spread across the country. Primary focus is given on the marketing of tilapia in Metro Manila."
    );
  });

  it("returns null when the summary holds nothing but the title and names", () => {
    expect(dspace6Abstract(`${title}\nRaneses, Benjamin S., Jr.`, title, authors)).toBeNull();
    expect(dspace6Abstract(null, title, authors)).toBeNull();
  });
});
