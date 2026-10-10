import type { MetadataRoute } from "next";

/**
 * Web app manifest (/manifest.webmanifest), so phones and desktop Chrome can
 * install Thesisweb with its own icon and window. Works with public/sw.js,
 * which keeps visited pages available offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thesisweb: RRL toolkit",
    short_name: "Thesisweb",
    description: "Find related literature across free academic databases, keep it organised, and cite it.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfcf0",
    theme_color: "#684c96",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search" },
      { name: "Library", url: "/library" },
      { name: "Cite", url: "/cite" },
    ],
  };
}
