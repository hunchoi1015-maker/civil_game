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
        className="relative w-14 h-14 bg-slate-800 border-2 border-purple-500 rounded-full flex flex-col items-center justify-center hover:bg-slate-700 hover:scale-110 transition-all shadow-lg group"
        title="문화 트랙 상시 확인"
      >
        <span className="text-2xl group-hover:animate-bounce">🎭</span>
        {/* 현재 트랙 레벨을 뱃지 형태로 보여줍니다 */}
        <div className="absolute -bottom-1 -right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300 shadow-md">
          Lv.{currentPlayer.cultureTrack}
        </div>
      </button>

      {/* 버튼을 누르면 기존에 만들어둔 모달을 그대로 띄웁니다! */}
      {isOpen && <CultureTrackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}