"use client";

import { toast } from "@/components/Toaster";

/**
 * Copy text to the clipboard and say whether it worked. The clipboard can be
 * blocked (a page not on https, permissions, some in-app browsers), so success
 * is announced only once it really happened. `onCopied` replaces the "copied"
 * message, for a button that says "Copied" itself.
 */
export function copyText(text: string, what: string, onCopied?: () => void): void {
  navigator.clipboard.writeText(text).then(
    () => (onCopied ? onCopied() : toast(`${what} copied`, "success")),
    () => toast(`Could not copy. Select the ${what.toLowerCase() === "link" ? "link" : "text"} instead.`, "error")
  );
}
