import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/** Mongolia Journals Online: keyless OJS portal of peer-reviewed national journals. */
export const searchMongoliajol = ojsAdapter({
  id: "mongoliajol",
  searchUrl: "https://mongoliajol.info/index.php/index/search/search",
  publisher: "Mongolia Journals Online",
});
