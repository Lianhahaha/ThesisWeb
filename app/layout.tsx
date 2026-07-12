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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen" style={{ backgroundColor: "rgb(var(--bg))", color: "rgb(var(--text))" }}>
        <Providers>
          {/* GitHub-style top header bar */}
          <Header />
          {/* Page content */}
          <main className="mx-auto w-full max-w-[1280px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-6">
            {children}
          </main>
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
