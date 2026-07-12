"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };
let _id = 0;
const listeners = new Set<(t: Toast[]) => void>();
let queue: Toast[] = [];

export function toast(message: string, type: Toast["type"] = "info") {
  const t: Toast = { id: ++_id, type, message };
  queue = [...queue, t];
  listeners.forEach((l) => l(queue));
  setTimeout(() => {
    queue = queue.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(queue));
  }, 3500);
}

const STYLES = {
  success: { bg: "rgba(106,176,106,0.12)", border: "rgba(106,176,106,0.35)", color: "#6ab06a", icon: CheckCircle2 },
  error:   { bg: "rgba(232,82,62,0.12)",   border: "rgba(232,82,62,0.35)",   color: "#e8523e", icon: AlertCircle },
  info:    { bg: "rgba(232,160,48,0.12)",   border: "rgba(232,160,48,0.35)",  color: "#e8a030", icon: Info },
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  return (
    <div className="fixed bottom-4 right-3 sm:right-4 z-50 flex flex-col gap-2 w-[calc(100vw-24px)] max-w-[340px]">
      {items.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm shadow-lg"
            style={{
              backgroundColor: s.bg,
              border: `1px solid ${s.border}`,
              color: "rgb(var(--text))",
              animation: "slideUp 0.2s ease",
            }}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: s.color }} />
            <span className="flex-1 text-xs leading-relaxed">{t.message}</span>
            <button
              onClick={() => {
                queue = queue.filter((x) => x.id !== t.id);
                listeners.forEach((l) => l(queue));
              }}
              className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
              style={{ color: "rgb(var(--muted))" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
