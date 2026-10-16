import type { Metadata, Viewport } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/layout/Providers";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { Toaster } from "@/components/Toaster";
import { Analytics } from "@vercel/analytics/react";
import { THEME_SCRIPT } from "@/lib/theme";
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_JSON_LD, SITE_NAME, SITE_OPEN_GRAPH, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Self-hosted at build time, so there is no layout shift or runtime font request.
const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: [
    "RRL", "review of related literature", "related literature and studies", "thesis", "research paper",
    "Philippines", "local studies", "foreign studies", "synthesis matrix", "APA citation generator",
    "free academic databases", "senior high school research", "college thesis",
  ],
  alternates: { canonical: "/" },
  openGraph: { ...SITE_OPEN_GRAPH, title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  // Google Search Console: paste the verification code in Vercel's environment variables.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  applicationName: "Thesisweb",
  category: "education",
  appleWebApp: { capable: true, title: "Thesisweb", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcf0" },
    { media: "(prefers-color-scheme: dark)", color: "#191816" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          // "<" escaped so no text in the data can close the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
            {children}
          </main>
          {/* The footer carries the bottom padding that clears the mobile tab bar. */}
          <Footer />
          <Toaster />
          <ServiceWorker />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
