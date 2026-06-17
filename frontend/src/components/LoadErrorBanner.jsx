export default function LoadErrorBanner({ title, message, onRetry, retryLabel = "Retry" }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="bg-red-50 text-red-900 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3"
    >
      <div>
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className="text-sm mt-0.5">{message}</div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="sm:ml-auto shrink-0 text-sm px-3 py-1.5 rounded-md border border-red-300 bg-white hover:bg-red-100"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
