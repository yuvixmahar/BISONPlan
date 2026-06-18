export default function BudgetNoticeBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="bg-bison-gold/20 text-bison-brown border-b border-bison-gold/40">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-start gap-3">
        <div className="text-sm">
          <span className="font-semibold">Limited Aurora access: </span>
          {message}
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="ml-auto text-xs px-2 py-1 rounded bg-bison-gold/35 hover:bg-bison-gold/50 font-medium"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
