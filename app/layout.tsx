import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/Toaster";
import { Analytics } from "@vercel/analytics/react";

// Self-hosted at build time, so there is no layout shift or runtime font request.
const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "thesisweb ph",
  description:
    "Find related literature across free academic databases, keep it organised, and generate citations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          {/* pb-24 clears the mobile tab bar; sm+ has no bar. */}
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
            {children}
          </main>
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
