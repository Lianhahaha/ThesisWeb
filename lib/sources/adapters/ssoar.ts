import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * SSOAR, the Social Science Open Access Repository run by GESIS (Leibniz
 * Institute for the Social Sciences, Germany): 80k+ full-text articles,
 * working papers and reports in sociology, political science, psychology,
 * education and communication, many in English, all free to read.
 * https://www.ssoar.info
 */
export const searchSsoar = dspace6Adapter({
  id: "ssoar",
  base: "https://www.ssoar.info/ssoar",
  publisher: "SSOAR",
  allOpen: true,
});
