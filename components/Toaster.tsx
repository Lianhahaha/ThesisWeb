"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string; timer: ReturnType<typeof setTimeout> };

let _id = 0;
const listeners = new Set<(t: Toast[]) => void>();
let queue: Toast[] = [];

function emit() {
  listeners.forEach((l) => l(queue));
}

export function toast(message: string, type: ToastType = "info") {
  // Errors stay longer: they usually carry an instruction to act on.
  const ms = type === "error" ? 6000 : 3500;
  const id = ++_id;
  const timer = setTimeout(() => {
    queue = queue.filter((x) => x.id !== id);
    emit();
  }, ms);
  queue = [...queue, { id, type, message, timer }];
  emit();
}

function dismiss(t: Toast) {
  clearTimeout(t.timer);
  queue = queue.filter((x) => x.id !== t.id);
  emit();
}

const STYLES: Record<ToastType, { bg: string; border: string; label: string }> = {
  success: { bg: "rgb(var(--ok-d))", border: "rgb(var(--ok) / 0.5)", label: "Done" },
  error: { bg: "rgb(var(--danger-d))", border: "rgb(var(--danger) / 0.5)", label: "Problem" },
  info: { bg: "rgb(var(--surface2))", border: "rgb(var(--border2))", label: "Note" },
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-5 sm:w-[360px] md:bottom-5"
    >
      {items.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-lg border p-3 text-sm"
            style={{ backgroundColor: s.bg, borderColor: s.border }}
          >
            {/* Word, not just colour, so the type is clear without colour vision. */}
            <span className="shrink-0 font-semibold">{s.label}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t)}
              aria-label="Dismiss"
              className="shrink-0 text-muted hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
