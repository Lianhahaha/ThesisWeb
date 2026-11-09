import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * Benguet State University Repository: theses, dissertations and research
 * from BSU in La Trinidad, Benguet, strong in Cordillera agriculture, rice,
 * nursing, education and indigenous community studies. Free to read.
 * https://repository.bsu.edu.ph
 */
export const searchBsu = dspace6Adapter({
  id: "bsu",
  base: "https://repository.bsu.edu.ph",
  publisher: "Benguet State University",
  allOpen: true,
  timeoutMs: 12000,
});
