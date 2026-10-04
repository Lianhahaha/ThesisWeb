import { vufindAdapter } from "@/lib/sources/platforms/vufind";

/**
 * BDTD, Brazil's national digital library of theses and dissertations
 * (IBICT): 900k+ master's and doctoral theses from Brazilian universities,
 * full text free, mostly in Portuguese with English abstracts.
 * https://bdtd.ibict.br
 */
export const searchBdtd = vufindAdapter({
  id: "bdtd",
  api: "https://bdtd.ibict.br/vufind/api/v1",
  fallbackVenue: "BDTD",
  recordUrl: (id) => `https://bdtd.ibict.br/vufind/Record/${encodeURIComponent(id)}`,
});
