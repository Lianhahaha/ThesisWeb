"use client";

import { useEffect, useRef, useState } from "react";
import { Info, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { TermsContent } from "@/components/legal/TermsContent";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { LEGAL_UPDATED } from "@/lib/legal";
import { acceptTerms, hasAcceptedTerms } from "@/lib/terms";

/** How close to the bottom counts as "read the end". */
const BOTTOM_SLACK = 16;

/**
 * A document title that sticks to the top of the scrolling panel while its
 * section is in view, so the reader always knows which document they are in.
 */
function SectionHeader({ id, index, title, first = false }: { id: string; index: number; title: string; first?: boolean }) {
  return (
    <div className={`sticky top-0 z-10 -mx-4 border-b border-border bg-surface px-4 pb-2 pt-3 ${first ? "-mt-4" : ""}`}>
      <p className="eyebrow flex items-center gap-2" style={{ color: "rgb(var(--accent))" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "rgb(var(--accent))" }} aria-hidden />
        Section {index} of 2
      </p>
      <h2 id={id} className="display mt-1" style={{ fontSize: "1.5rem" }}>{title}</h2>
      <p className="mt-0.5 text-xs text-subtle">Last updated {LEGAL_UPDATED}</p>
    </div>
  );
}

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
          <p className="flex items-start justify-center gap-1.5 text-center text-xs text-subtle" aria-live="polite">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {reachedEnd
                ? "Read the Terms of Use and Privacy Policy first to proceed."
                : "Read the Terms of Use and Privacy Policy first — scroll to the end to continue."}
            </span>
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
          <SectionHeader id="gate-terms" index={1} title="Terms of Use" first />
          <TermsContent />
        </section>

        <hr className="my-8 border-border" />

        <section aria-labelledby="gate-privacy">
          <SectionHeader id="gate-privacy" index={2} title="Privacy Policy" />
          <PrivacyContent />
        </section>

        <p className="mt-8 border-t border-border pt-4 text-center text-xs text-subtle">
          End of the Terms of Use and Privacy Policy.
        </p>
      </div>
    </Dialog>
  );
}
