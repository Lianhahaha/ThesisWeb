import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
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
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
