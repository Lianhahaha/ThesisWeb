import { vufindAdapter } from "@/lib/sources/platforms/vufind";

/**
 * LA Referencia: the federated network of open-access repositories of
 * Latin America (Argentina, Brazil, Chile, Colombia, Mexico, Peru and more):
 * articles, theses and reports, mostly in Spanish and Portuguese, all free.
 * https://www.lareferencia.info
 */
export const searchLaReferencia = vufindAdapter({
  id: "lareferencia",
  api: "https://www.lareferencia.info/vufind/api/v1",
  fallbackVenue: "LA Referencia",
  recordUrl: (id) => `https://www.lareferencia.info/vufind/Record/${encodeURIComponent(id)}`,
});
