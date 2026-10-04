import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastValue {
  show: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), action ? 6000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-center gap-4 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="font-semibold text-brand-500 hover:text-brand-100"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return value;
}
