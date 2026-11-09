"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { TermsContent } from "@/components/legal/TermsContent";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { LEGAL_UPDATED } from "@/lib/legal";
import { acceptTerms, hasAcceptedTerms } from "@/lib/terms";

/** How close to the bottom counts as "read the end". */
const BOTTOM_SLACK = 16;

/**
 * Blocks the app until the visitor accepts the Terms of Use and the Privacy
 * Policy. The full text of both is shown in a small, scrollable panel, and the
 * checkbox stays disabled until the bottom of the text has been reached, so
 * accepting is an informed act rather than a blind click. Acceptance is
 * remembered per device and asked again when either page changes.
 */
export function TermsGate() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasAcceptedTerms()) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = body.current;
    if (!el) return;

    const check = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_SLACK) setReachedEnd(true);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [open]);

  if (!open) return null;

  return (
    <Dialog
      title="Before you continue"
      onClose={() => {}}
      dismissible={false}
      placement="center"
      className="max-h-[85vh] max-w-md"
      overlayClassName="bg-black/60 backdrop-blur-md"
      bodyRef={body}
      footer={
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface2 p-3 ${
              reachedEnd ? "" : "cursor-not-allowed opacity-60"
            }`}
          >
            <input
              type="checkbox"
              checked={accepted}
              disabled={!reachedEnd}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded"
              style={{ accentColor: "rgb(var(--accent))" }}
            />
            <span className="text-sm text-text">
              I have read and agree to the Terms of Use and the Privacy Policy.
            </span>
          </label>
          <p className="text-center text-xs text-subtle" aria-live="polite">
            {reachedEnd
              ? "The box is unlocked."
              : "Scroll to the end of both documents to unlock the box."}
          </p>
          <button
            type="button"
            disabled={!reachedEnd || !accepted}
            onClick={() => {
              acceptTerms();
              setOpen(false);
            }}
            className="btn-primary w-full"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Accept and continue
          </button>
        </div>
      }
    >
      <div className="prose-read">
        <section aria-labelledby="gate-terms">
          <h2 id="gate-terms" className="display text-xl">Terms of Use</h2>
          <p className="mt-1 text-xs text-subtle">Last updated {LEGAL_UPDATED}</p>
          <TermsContent />
        </section>

        <hr className="my-8 border-border" />

        <section aria-labelledby="gate-privacy">
          <h2 id="gate-privacy" className="display text-xl">Privacy Policy</h2>
          <p className="mt-1 text-xs text-subtle">Last updated {LEGAL_UPDATED}</p>
          <PrivacyContent />
        </section>

        <p className="mt-8 border-t border-border pt-4 text-center text-xs text-subtle">
          End of the Terms of Use and Privacy Policy.
        </p>
      </div>
    </Dialog>
  );
}
