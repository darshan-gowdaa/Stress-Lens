'use client';
import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let listeners: Array<(t: ToastMessage) => void> = [];
let counter = 0;

// global toast emitter - call toast.success/error/info from anywhere
export const toast = {
  success: (message: string) => emit('success', message),
  error:   (message: string) => emit('error', message),
  info:    (message: string) => emit('info', message),
};

function emit(type: ToastType, message: string) {
  const t: ToastMessage = { id: ++counter, type, message };
  listeners.forEach(fn => fn(t));
}

const icons = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M15 9 9 15M9 9l6 6" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
    </svg>
  ),
};

const bgMap = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  info:    'bg-[var(--color-primary)]',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (t: ToastMessage) => {
      setToasts(prev => [...prev, t]);
      // auto-dismiss after 4s
      setTimeout(() => remove(t.id), 4000);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter(fn => fn !== handler); };
  }, [remove]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={`
            ${bgMap[t.type]} text-white flex items-center gap-3
            px-4 py-3 rounded-[var(--radius-lg)] shadow-xl
            pointer-events-auto animate-fade-in-up
            max-w-sm text-sm font-medium
          `}
        >
          <span className="shrink-0">{icons[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
