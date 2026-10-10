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

// Self-hosted at build time, so there is no layout shift or runtime font request.
const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thesisweb",
  description:
    "Find related literature across free academic databases, keep it organised, and generate citations.",
  applicationName: "Thesisweb",
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
