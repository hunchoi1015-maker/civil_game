// src/components/game/CultureTrackWidget.tsx

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CultureTrackModal } from './CultureTrackModal';

export function CultureTrackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { players, currentPlayerIndex } = useGameStore();
  
  const currentPlayer = players[currentPlayerIndex];

  if (!currentPlayer) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-12 h-12 bg-slate-900 border-2 border-purple-500/60 rounded-full flex flex-col items-center justify-center hover:bg-slate-800 hover:border-purple-400 hover:scale-110 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] group z-40"
        title="문화 트랙 확인"
      >
        <span className="text-2xl group-hover:animate-bounce filter drop-shadow-md">🎭</span>
        {/* 현재 트랙 레벨을 뱃지 형태로 보여줍니다 */}
        <div className="absolute -bottom-1 -right-2 bg-purple-900 text-amber-100 font-cinzel text-[11px] font-bold px-2 py-0.5 rounded-full border border-purple-400 shadow-lg">
          Lv.{currentPlayer.cultureTrack}
        </div>
      </button>

      {isOpen && <CultureTrackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}