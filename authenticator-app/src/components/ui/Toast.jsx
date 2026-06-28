/**
 * Toast — in-app notification system
 *
 * Exports:
 *   ToastProvider  — wrap app (or subtree) with this
 *   useToast()     — returns toast(message, type?) function
 *                    type: 'info' | 'success' | 'warning' | 'error'
 *
 * Toasts auto-dismiss after 2500ms.
 * Container is aria-live="polite" for screen reader announcements.
 */
import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'info') => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 2500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="ds-toast-container"
        aria-live="polite"
        aria-atomic="false"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ds-toast ds-toast--${t.type}`}
            onClick={() => dismiss(t.id)}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * @returns {(message: string, type?: 'info'|'success'|'warning'|'error') => void}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
