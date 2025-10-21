import { useEffect } from 'react';
import { useToastStore } from '../lib/notifications';

const typeStyles: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  error: 'bg-red-100 text-red-800 border-red-300'
};

const AUTO_CLOSE_MS = 4200;

const ToastContainer = () => {
  const { toasts, dismiss } = useToastStore();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dismiss(toast.id), AUTO_CLOSE_MS)
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, dismiss]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border rounded-lg px-4 py-3 shadow ${typeStyles[toast.type]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => dismiss(toast.id)}
            >
              关闭
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
