// src/components/game/ToastNotification.tsx

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import clsx from 'clsx';

const TOAST_ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const TOAST_COLORS = {
  info: 'bg-blue-900/90 border-blue-500 text-blue-100',
  success: 'bg-emerald-900/90 border-emerald-500 text-emerald-100',
  warning: 'bg-amber-900/90 border-amber-500 text-amber-100',
  error: 'bg-rose-900/90 border-rose-500 text-rose-100',
};

export function ToastNotification() {
  const { toasts, removeToast } = useGameStore();

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none items-center">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: any; onRemove: () => void }) {
  // 3초 뒤에 자동으로 알림이 사라지도록 타이머 설정
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        'flex items-center gap-3 px-5 py-3 rounded-lg border shadow-xl backdrop-blur-md min-w-[320px] max-w-lg pointer-events-auto',
        TOAST_COLORS[toast.type as keyof typeof TOAST_COLORS]
      )}
    >
      <span className="text-xl drop-shadow-md">
        {TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS]}
      </span>
      <p className="text-sm font-medium leading-snug break-keep text-shadow-sm">
        {toast.message}
      </p>
    </motion.div>
  );
}