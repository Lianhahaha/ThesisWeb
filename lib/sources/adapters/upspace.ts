import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * UPSpace, the repository of the University of Pretoria (South Africa):
 * master's and doctoral theses, articles and reports in education,
 * health sciences, veterinary science, engineering and economics, one of
 * the largest open research collections in Africa.
 * https://repository.up.ac.za
 */
export const searchUpspace = dspace7Adapter({
  id: "upspace",
  api: "https://repository.up.ac.za/server/api",
  publisher: "University of Pretoria",
  // Theses state dc.description.availability ("Unrestricted").
  allOpen: false,
});
