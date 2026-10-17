import { AlertTriangle, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface InterruptSessionModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  textTitle?: string | null;
}

export const InterruptSessionModal: React.FC<InterruptSessionModalProps> = ({
  isOpen,
  textTitle,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        aria-describedby="interrupt-session-modal-desc"
        aria-labelledby="interrupt-session-modal-title"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-paper p-6 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between border-stone-100 border-b pb-3">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
            <h2
              className="font-bold font-fun text-base text-stone-900"
              id="interrupt-session-modal-title"
            >
              Interrompre la séance ?
            </h2>
          </div>
          <button
            aria-label="Fermer la fenêtre"
            className="cursor-pointer rounded-lg p-1 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3" id="interrupt-session-modal-desc">
          <p className="text-stone-700 text-xs leading-relaxed">
            Une séance de lecture est actuellement en cours
            {textTitle ? (
              <>
                {" "}
                sur <strong className="text-stone-900">« {textTitle} »</strong>
              </>
            ) : null}
            .
          </p>
          <p className="text-stone-600 text-xs leading-relaxed">
            Si vous quittez maintenant, l’enregistrement et la progression de
            cette séance seront perdus.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-stone-100 border-t pt-3">
          <button
            autoFocus
            className="cursor-pointer rounded-xl border border-stone-200 bg-cream/60 px-3.5 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
            onClick={onCancel}
            type="button"
          >
            Continuer la séance
          </button>
          <button
            className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 font-bold text-white text-xs transition-colors hover:bg-rose-700"
            onClick={onConfirm}
            type="button"
          >
            Quitter la séance
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
