'use client';
import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let globalToastFn: ((msg: string, type?: Toast['type']) => void) | null = null;

export function registerToast(fn: (msg: string, type?: Toast['type']) => void) {
  globalToastFn = fn;
}

export function showToast(msg: string, type: Toast['type'] = 'success') {
  if (globalToastFn) globalToastFn(msg, type);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Register globally
  if (typeof window !== 'undefined') {
    registerToast(addToast);
  }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? '✅ ' : t.type === 'error' ? '❌ ' : 'ℹ️ '}
          {t.message}
        </div>
      ))}
    </div>
  );
}
