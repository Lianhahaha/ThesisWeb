"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DexieHooksProvider } from "@/components/DexieHooksProvider";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAnalytics />
      <DexieHooksProvider>{children}</DexieHooksProvider>
    </QueryClientProvider>
  );
}
