import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { StatusClient } from "@/components/StatusClient";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Status",
    description: "Current Thesisweb service status and configured integrations.",
    path: "/status",
  }),
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <p className="eyebrow">Status</p>
      <h1 className="display mt-3 text-3xl">Service status</h1>
      <p className="mt-2 text-muted">
        A quick liveness check for the web app and its optional integrations.
      </p>
      <StatusClient />
    </div>
  );
}
