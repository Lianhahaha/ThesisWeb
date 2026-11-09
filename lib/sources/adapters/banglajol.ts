import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/** BanglaJOL: keyless OJS portal of peer-reviewed national journals. */
export const searchBanglajol = ojsAdapter({
  id: "banglajol",
  searchUrl: "https://www.banglajol.info/index.php/index/search/search",
  publisher: "BanglaJOL",
});
