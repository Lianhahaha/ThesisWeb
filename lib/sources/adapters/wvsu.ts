import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * The institutional repository of West Visayas State University (Iloilo
 * City): graduate theses and dissertations in education, nursing,
 * management and public administration, many on schools and communities
 * in Western Visayas.
 * https://repository.wvsu.edu.ph
 */
export const searchWvsu = dspace6Adapter({
  id: "wvsu",
  base: "https://repository.wvsu.edu.ph",
  publisher: "West Visayas State University",
});
