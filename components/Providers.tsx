"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DexieHooksProvider } from "@/components/DexieHooksProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  // Always use dark mode (GitHub theme)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    document.documentElement.classList.add("dark");
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DexieHooksProvider>{mounted && children}</DexieHooksProvider>
    </QueryClientProvider>
  );
}
