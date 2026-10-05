import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * UPLOAD, the repository of the University of the Philippines Open
 * University (Los Baños): graduate theses, capstone projects and faculty
 * research on distance and online education, development communication,
 * health informatics and environment and natural resources management.
 * https://repository.upou.edu.ph
 */
export const searchUpou = dspace7Adapter({
  id: "upou",
  // The REST API lives on its own subdomain, not under /server/api.
  api: "https://api.repository.upou.edu.ph/api",
  publisher: "University of the Philippines Open University",
  allOpen: false,
});
