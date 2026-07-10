"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function ConfirmationToast() {
  const toast = useAppStore((state) => state.toast);
  const dismissToast = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(dismissToast, 7_000);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast]);

  if (!toast) return null;

  return (
    <section className="fixed bottom-16 right-4 z-[130] w-[min(360px,calc(100vw-2rem))] win95-window shadow-[6px_6px_0_rgba(0,0,0,.35)]">
      <div className="win95-titlebar">
        <span>CONFIRMATION.EXE</span>
        <button
          aria-label="Dismiss confirmation"
          className="grid h-[18px] w-[18px] place-items-center border-b-2 border-r-2 border-b-[#404040] border-r-[#404040] border-l-2 border-t-2 border-l-white border-t-white bg-[#c0c0c0] text-black"
          onClick={dismissToast}
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="win95-window-body grid gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center border-b-2 border-r-2 border-b-[#404040] border-r-[#404040] border-l-2 border-t-2 border-l-white border-t-white bg-[#008000] text-lg font-black text-white">
            OK
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-black">{toast.title}</div>
            <div className="mt-1 break-words text-xs font-bold text-[var(--muted)]">{toast.message}</div>
            {toast.signature && <div className="mt-1 break-all text-[11px] font-bold text-[#000080]">{shortSignature(toast.signature)}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          {toast.href && (
            <a className="win95-button flex-1 text-center" href={toast.href} rel="noreferrer" target="_blank">
              View Tx
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}
          <button className="win95-button flex-1" onClick={dismissToast} type="button">
            OK
          </button>
        </div>
      </div>
    </section>
  );
}

function shortSignature(signature: string) {
  if (signature.length <= 18) return signature;
  return `${signature.slice(0, 10)}...${signature.slice(-8)}`;
}
