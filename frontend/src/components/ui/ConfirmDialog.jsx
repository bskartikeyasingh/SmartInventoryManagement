import React from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action may be irreversible.",
  confirmText = "Confirm",
  confirmVariant = "danger", // danger, primary
  loading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm text-secondary leading-relaxed">
          {message}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-border text-charcoal hover:bg-muted text-sm font-medium transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition flex items-center gap-2 ${
            confirmVariant === "danger"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-vermilion hover:bg-vermilion-hover"
          }`}
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
