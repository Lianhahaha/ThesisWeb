import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/**
 * The Philippine Normal University research portal: one search across its
 * peer-reviewed, open-access education journals (The Normal Lights, APHERJ,
 * AsTEN Journal of Teacher Education, Paghabi).
 * https://po.pnuresearchportal.org/ejournal
 */
export const searchPnu = ojsAdapter({
  id: "pnu",
  searchUrl: "https://po.pnuresearchportal.org/ejournal/index.php/index/search/search",
  publisher: "Philippine Normal University",
  journals: {
    normallights: "The Normal Lights",
    normallightspje: "Normal Lights: The Philippine Journal of Education",
    apherj: "Asia Pacific Higher Education Research Journal",
    asten: "AsTEN Journal of Teacher Education",
    astenspecialissueportal: "AsTEN Journal of Teacher Education",
    paghabi: "PAGHABI: Journal of Global Citizenship Education Research and Practice",
  },
});
