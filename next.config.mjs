/**
 * Content Security Policy: where the page may load scripts, styles, frames and
 * connections from. Firebase needs Google's sign-in script and its auth-domain
 * iframe, Firestore and Analytics talk to googleapis.com, and Vercel Analytics
 * is served from this site. 'unsafe-inline' scripts are still allowed because
 * Next.js inlines its page data and the theme script runs before paint; a
 * nonce would force every page to render per request instead of being static.
 */
const emulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.googletagmanager.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
    "https://va.vercel-scripts.com",
    ...(emulators || dev ? ["http://127.0.0.1:9099 http://127.0.0.1:8085 ws://127.0.0.1:8085"] : []),
    ...(dev ? ["ws://localhost:*"] : []),
  ].join(" "),
  // Google sign-in runs through an iframe on the Firebase auth domain.
  "frame-src 'self' https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://apis.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // No other site may show Thesisweb in a frame (clickjacking).
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Google sign-in opens a popup that must still be able to talk back to this page.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must never be cached, or a fix to it would take days to reach users.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
