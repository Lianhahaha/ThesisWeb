import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * WHO IRIS, the World Health Organization's institutional repository:
 * guidelines, technical reports, country profiles and journal articles
 * from WHO headquarters and its regional offices, including the Western
 * Pacific office in Manila. Everything is free to read.
 * https://iris.who.int
 */
export const searchWho = dspace7Adapter({
  id: "who",
  api: "https://iris.who.int/server/api",
  publisher: "World Health Organization",
  allOpen: true,
  // Governing-body papers (resolutions, agenda items) and speeches outrank
  // research on most health topics; leave them out.
  filters: [
    "Governing Bodies documents", "Governing Bodies Documents", "Governing body documents", "Speeches and Remarks",
  ].map((t): [string, string] => ["itemtype", `${t},notequals`]),
  // Each document is also deposited once per UN language.
  language: "en",
  // Typically answers in 8-13 s.
  timeoutMs: 15000,
});
