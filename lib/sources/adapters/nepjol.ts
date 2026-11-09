import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/** NepJOL: keyless OJS portal of peer-reviewed national journals. */
export const searchNepjol = ojsAdapter({
  id: "nepjol",
  searchUrl: "https://www.nepjol.info/index.php/index/search/search",
  publisher: "NepJOL",
});
