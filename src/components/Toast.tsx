"use client";

import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;
const listeners: Set<(toasts: ToastItem[]) => void> = new Set();
let currentToasts: ToastItem[] = [];

function emit() {
  listeners.forEach((fn) => fn([...currentToasts]));
}

export function showToast(message: string, type: "success" | "error" = "success") {
  const id = ++toastId;
  currentToasts = [...currentToasts, { id, message, type }];
  emit();
  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    emit();
  }, 2500);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    return () => { listeners.delete(setToasts); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-5 py-3 rounded-full text-sm font-medium shadow-lg animate-in"
          style={{
            background: t.type === "success" ? "#1d1d1f" : "#ff3b30",
            color: "#fff",
            animation: "toastIn 0.3s ease",
          }}
        >
          {t.message}
        </div>
      ))}
      <style jsx global>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
