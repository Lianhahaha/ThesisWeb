"use client";

/**
 * Save text as a file from the browser: reference lists (.rtf, .bib, .ris),
 * the synthesis matrix (.csv, .rtf) and library backups (.json).
 */
export function downloadFile(content: string, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking in the same tick as the click can cancel the download in some
  // browsers; the file is tiny, so keeping the URL a moment costs nothing.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
