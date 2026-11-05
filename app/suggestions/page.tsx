import type { Metadata } from "next";
import { SuggestionsClient } from "@/components/SuggestionsClient";

export const metadata: Metadata = {
  title: "Problems and suggestions",
  description: "Report a problem or leave a suggestion for Thesisweb.",
  robots: { index: false, follow: false },
};

export default function SuggestionsPage() {
  return <SuggestionsClient />;
}
