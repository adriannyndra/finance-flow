'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      button: 'bg-rose-600 hover:bg-rose-500 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      button: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      button: 'bg-blue-600 hover:bg-blue-500 text-white',
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
            {style.icon}
          </div>
          
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {title}
          </h3>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${style.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
