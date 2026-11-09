"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { CONTACT_EMAIL } from "@/lib/legal";
import { acceptTerms, hasAcceptedTerms } from "@/lib/terms";

/**
 * Blocks the app until the visitor accepts the Terms of Use and the Privacy
 * Policy. It appears once per device, and again after either page is updated.
 * The panel is small and scrollable so it fits a phone without covering everything.
 */
export function TermsGate() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!hasAcceptedTerms()) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <Dialog
      title="Before you continue"
      onClose={() => {}}
      dismissible={false}
      placement="center"
      className="max-h-[80vh] max-w-md"
      overlayClassName="bg-black/60 backdrop-blur-md"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!accepted}
            onClick={() => {
              acceptTerms();
              setOpen(false);
            }}
            className="btn-primary w-full"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Accept and continue
          </button>
          <p className="text-center text-xs text-subtle">
            Questions? Write to <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          </p>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-muted">
        <p>
          Thesisweb is a free research aid. Before you use it, please read the terms that
          apply and how your data is handled.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-text">
              Terms of Use
            </Link>{" "}
            — what the app does and does not promise, and what you may not do with it.
          </li>
          <li>
            <Link href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-text">
              Privacy Policy
            </Link>{" "}
            — what is stored in your browser and, if you make an account, on Firebase.
          </li>
        </ul>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface2 p-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded"
            style={{ accentColor: "rgb(var(--accent))" }}
          />
          <span className="text-text">
            I have read and agree to the Terms of Use and the Privacy Policy.
          </span>
        </label>
      </div>
    </Dialog>
  );
}
