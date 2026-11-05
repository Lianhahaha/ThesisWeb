import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/**
 * Acta Medica Philippina, the national health sciences journal published
 * by the University of the Philippines Manila since 1939: peer-reviewed,
 * open access, mostly Philippine clinical and public health studies.
 * https://actamedicaphilippina.upm.edu.ph
 */
export const searchActaMedica = ojsAdapter({
  id: "actamedica",
  searchUrl: "https://actamedicaphilippina.upm.edu.ph/index.php/acta/search",
  publisher: "Acta Medica Philippina",
  // The journal's OJS server is slow; the default 10 s cut it off.
  timeoutMs: 16000,
});
