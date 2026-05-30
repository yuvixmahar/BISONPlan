import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const TONE_STYLES = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

export default function PlannerToast({ notice, onDismiss }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => onDismissRef.current(), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return createPortal(
    <div
      className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <div
        className={`rounded-lg border px-4 py-3 shadow-xl flex items-start justify-between gap-3 ${
          TONE_STYLES[notice.tone] || TONE_STYLES.success
        }`}
      >
        <span className="text-sm font-medium">{notice.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs px-2 py-1 rounded border border-current/20 hover:bg-white/40 shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body
  );
}
