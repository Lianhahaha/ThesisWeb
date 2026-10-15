"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog: a sheet from the bottom on phones, a centred panel from sm
 * up. Escape, the close button and a click outside close it. Focus moves into
 * it, Tab and Shift+Tab stay inside it, the page behind doesn't scroll, and
 * focus returns to what opened it, so keyboard and screen-reader users never
 * end up behind the overlay.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  className = "max-h-[92vh] max-w-2xl",
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Size of the panel: max width and height classes. */
  className?: string;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // The latest onClose, without re-running the setup below when a parent passes a new function.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={() => close.current()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col rounded-t-2xl border border-border bg-surface text-left sm:rounded-2xl ${className}`}
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 id={titleId} className="text-lg">{title}</h2>
          <button ref={closeButton} type="button" onClick={() => close.current()} className="btn-ghost btn-sm !px-2" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <footer className="border-t border-border p-4 text-sm">{footer}</footer>}
      </div>
    </div>
  );
}
