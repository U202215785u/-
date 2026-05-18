"use client";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "确认",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-full hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-full text-white transition-colors"
            style={{ background: destructive ? "#ff3b30" : "#1d1d1f" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
