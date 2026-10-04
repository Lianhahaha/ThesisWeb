import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * CGSpace, the repository of CGIAR's agricultural research centres,
 * including the International Rice Research Institute (IRRI, Los Baños),
 * WorldFish, ILRI and CIMMYT: journal articles, reports, briefs and theses
 * on crops, livestock, fisheries, nutrition and climate.
 * https://cgspace.cgiar.org
 */
export const searchCgspace = dspace7Adapter({
  id: "cgspace",
  api: "https://cgspace.cgiar.org/server/api",
  publisher: "CGIAR",
  // Records carry dcterms.accessRights ("Open Access" / "Limited Access").
  allOpen: false,
});
