import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/** Vietnam Journals Online: keyless OJS portal of peer-reviewed national journals. */
export const searchVietnamjol = ojsAdapter({
  id: "vietnamjol",
  searchUrl: "https://vjol.info.vn/index.php/index/search/search",
  publisher: "Vietnam Journals Online",
});
