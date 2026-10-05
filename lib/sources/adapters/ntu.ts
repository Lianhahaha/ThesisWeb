import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * DR-NTU, the digital repository of Nanyang Technological University
 * (Singapore): theses, final-year projects, journal articles and
 * conference papers in engineering, computing, business, education
 * (incl. the National Institute of Education) and Southeast Asian studies.
 * https://dr.ntu.edu.sg
 */
export const searchNtu = dspace7Adapter({
  id: "ntu",
  api: "https://dr.ntu.edu.sg/server/api",
  publisher: "Nanyang Technological University",
  // Records carry datacite.rights ("open" / "restricted" / "embargoed").
  allOpen: false,
});
