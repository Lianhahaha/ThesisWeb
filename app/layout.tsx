import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/Toaster";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "ThesisWeb — RRL finder, reference manager & AI self-check",
  description:
    "Find recent related literature, organize it, and pre-check your writing for AI-likeness before submitting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
