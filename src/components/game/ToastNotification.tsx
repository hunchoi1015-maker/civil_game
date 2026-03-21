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
        // 🌟 [수정] panel-texture 와 font-serif 적용
        'flex items-center gap-3 px-5 py-3 rounded-lg border shadow-glow-gold backdrop-blur-md min-w-[320px] max-w-lg pointer-events-auto font-serif relative overflow-hidden',
        TOAST_COLORS[toast.type as keyof typeof TOAST_COLORS]
      )}
    >
      {/* 🌟 텍스처 오버레이 */}
      <div className="absolute inset-0 bg-texture-dark opacity-40 mix-blend-overlay pointer-events-none" />
      
      <span className="text-2xl drop-shadow-md relative z-10">
        {TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS]}
      </span>
      <p className="text-base font-semibold leading-snug break-keep text-shadow-sm relative z-10 text-amber-50">
        {toast.message}
      </p>
    </motion.div>
  );
}