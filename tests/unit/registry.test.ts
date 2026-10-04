import { describe, expect, it } from "vitest";
import { FIELDS, KINDS, SOURCE_META } from "@/lib/sources/meta";
import { ADAPTERS } from "@/lib/sources/registry";

describe("source registry", () => {
  it("has an adapter for every source in the metadata, and nothing else", () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual(Object.keys(SOURCE_META).sort());
  });

  it("gives every source a label, a description and a hex colour", () => {
    for (const [id, m] of Object.entries(SOURCE_META)) {
      expect(m.label, id).toBeTruthy();
      expect(m.blurb, id).toBeTruthy();
      expect(m.color, id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("describes where each source is from, what it covers and what it holds", () => {
    for (const [id, m] of Object.entries(SOURCE_META)) {
      expect(m.region, id).toBeTruthy();
      expect(m.fields.length, id).toBeGreaterThan(0);
      for (const f of m.fields) expect(Object.keys(FIELDS), id).toContain(f);
      expect(Object.keys(KINDS), id).toContain(m.kind);
      expect(m.url, id).toMatch(/^https:\/\//);
    }
  });
});
