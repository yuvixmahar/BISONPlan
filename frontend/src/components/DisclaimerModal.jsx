import { DISCLAIMER_SECTIONS } from "../utils/disclaimer.js";

export default function DisclaimerModal({ onAccept }) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-bison-cream">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-bison-surface rounded-xl shadow-2xl border border-bison-border border-t-4 border-t-bison-gold"
      >
        <div className="px-6 pt-6 pb-4">
          <div id="disclaimer-title" className="font-heading text-2xl text-bison-brown">
            Before you continue
          </div>
          <p className="text-sm text-bison-text-muted mt-2 leading-relaxed">
            Please read the following before using BISONplan.
          </p>

          <div className="mt-4 space-y-4">
            {DISCLAIMER_SECTIONS.map((section) => (
              <section key={section.title}>
                <div className="text-sm font-semibold text-bison-brown">{section.title}</div>
                <p className="text-sm text-bison-text mt-1 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="w-full px-4 py-2.5 rounded-lg bg-bison-gold text-bison-brown text-base font-semibold hover:bg-bison-gold-dark transition-colors cursor-pointer"
          >
            I understand — continue to BISONplan
          </button>
        </div>
      </div>
    </div>
  );
}
