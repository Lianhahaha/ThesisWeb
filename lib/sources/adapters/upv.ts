import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * The repository of the University of the Philippines Visayas (Miagao,
 * Iloilo): theses and faculty research in fisheries and ocean sciences,
 * aquaculture, food science, management and the social sciences, much of
 * it from Western Visayas field work.
 * https://repository.upv.edu.ph
 */
export const searchUpv = dspace7Adapter({
  id: "upv",
  api: "https://repository.upv.edu.ph/server/api",
  publisher: "University of the Philippines Visayas",
  allOpen: false,
});
