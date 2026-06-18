import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export const TOAST_DURATION_MS = 2500;

const TONE_STYLES = {
  success: {
    panel: "bg-bison-gold/15 border-bison-gold/50 text-bison-brown",
    bar: "bg-bison-gold",
  },
  warning: {
    panel: "bg-bison-gold/10 border-bison-gold/40 text-bison-brown",
    bar: "bg-bison-gold-dark",
  },
  error: {
    panel: "bg-red-50 border-red-200 text-red-900",
    bar: "bg-red-500",
  },
};

export default function PlannerToast({ notice, onDismiss }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => onDismissRef.current(), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  const styles = TONE_STYLES[notice.tone] || TONE_STYLES.success;

  return createPortal(
    <div
      className="fixed bottom-4 left-1/2 z-200 w-[min(92vw,28rem)] -translate-x-1/2 pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]"
      role="status"
      aria-live="polite"
    >
      <div className={`rounded-lg border shadow-xl overflow-hidden ${styles.panel}`}>
        <div className="px-4 py-3 flex items-start justify-between gap-3">
          <span className="text-sm font-medium">{notice.message}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-2 py-1 rounded border border-current/20 hover:bg-white/40 shrink-0"
          >
            Dismiss
          </button>
        </div>
        <div className="h-1 bg-black/5" aria-hidden="true">
          <div
            key={notice.id ?? notice.message}
            className={`h-full toast-countdown-bar ${styles.bar}`}
            style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
