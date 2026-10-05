import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * SEAFDEC/AQD Institutional Repository (SAIR), the Southeast Asian Fisheries
 * Development Center's Aquaculture Department in Tigbauan, Iloilo: journal
 * articles, manuals, theses and conference papers on aquaculture, fisheries
 * and coastal communities, most of them from Philippine field work.
 * https://repository.seafdec.org.ph
 */
export const searchSeafdec = dspace6Adapter({
  id: "seafdec",
  base: "https://repository.seafdec.org.ph",
  publisher: "SEAFDEC Aquaculture Department",
});
