// src/components/game/CultureCardInventory.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import clsx from 'clsx';
import { getCultureCardLimit } from '../../store/helpers/playerHelpers'; 

export function CultureCardInventory() {
  const { 
    players, currentPlayerIndex, 
    startCardTargeting,
    discardCultureCard,
    addToast 
  } = useGameStore();

  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);

  // 🌟 한도 초과 상태 계산
  const currentLimit = getCultureCardLimit(player);
  const currentCount = player.cultureEventCards?.length || 0;
  const isOverLimit = currentCount > currentLimit;

  return (
    <div className="relative flex flex-col items-end font-serif z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full mb-4 right-0 panel-texture border-purple-500/50 rounded-xl w-[360px] shadow-2xl flex flex-col origin-bottom-right"
          >
            <div className="panel-content p-5">
              <div className="flex justify-between items-center border-b border-amber-700/30 pb-3 mb-3">
                <h4 className="text-xl font-black text-amber-400 text-glow-gold">🎭 보유한 이벤트 카드</h4>
                <button onClick={() => setIsOpen(false)} className="text-amber-500/50 hover:text-amber-400 text-xl">✕</button>
              </div>

              {/* 한도 초과 경고 메시지 */}
              {isOverLimit && (
                <div className="bg-red-950/80 border border-red-600 rounded-lg p-3 text-xs text-red-100 mb-3 shadow-inner">
                  <span className="font-bold text-red-400 text-sm flex items-center gap-1.5"><span>⚠️</span> 사용 불가 (한도 초과)</span>
                  <div className="mt-1.5 opacity-90 leading-relaxed">
                    현재 <span className="text-amber-400 font-cinzel font-bold text-sm mx-1">{currentCount} / {currentLimit}</span> 장입니다.<br/>
                    우측 휴지통(🗑️)을 눌러 카드를 버려야만 사용할 수 있습니다.
                  </div>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {player.cultureEventCards?.map(card => (
                  <div key={card.id} className="flex gap-2">
                    {/* 카드 본체 */}
                    <button 
                      onClick={() => {
                        if (isOverLimit) {
                            addToast(`보유 한도를 초과했습니다. 휴지통을 눌러 카드를 버려주세요.`, 'error');
                            return;
                        }
                        startCardTargeting(card.id);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "flex-1 p-3 rounded-lg text-left transition-all group border shadow-sm flex flex-col",
                        isOverLimit 
                          ? "bg-slate-900/60 border-slate-700 opacity-50 cursor-not-allowed" 
                          : "bg-slate-800/80 hover:bg-purple-900/40 border-amber-700/30 hover:border-purple-500"
                      )}
                    >
                      <div className="text-amber-100 font-bold mb-1.5 flex justify-between items-start">
                        <span className="leading-tight drop-shadow-sm">{card.name}</span>
                        <span className="text-[10px] font-cinzel bg-purple-900/80 border border-purple-500/50 px-1 py-0.5 rounded-full text-purple-200 shrink-0 shadow-inner">Lv.{card.level}</span>
                      </div>
                      <div className="text-[11px] text-amber-200/60 group-hover:text-amber-100 leading-tight font-sans">{card.description}</div>
                    </button>

                    {/* 휴지통 버튼 */}
                    <button
                      onClick={() => discardCultureCard(card.id)}
                      className="w-10 flex items-center justify-center bg-slate-800 hover:bg-red-900/80 border border-slate-700 hover:border-red-500 rounded-lg transition-colors text-lg shadow-sm"
                      title="카드 버리기"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              
              {currentCount === 0 && (
                  <div className="text-sm text-amber-200/50 text-center py-6 italic">보유한 이벤트 카드가 없습니다.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 토글 버튼 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "px-2 py-1 rounded-full font-serif font-bold shadow-lg transition-all flex items-center gap-2 whitespace-nowrap border-2 z-10",
          isOverLimit 
            ? "bg-red-950 text-red-200 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" 
            : "bg-slate-900 text-amber-100 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:scale-105 hover:border-purple-400"
        )}
      >
        <span className="text-2xl drop-shadow-md">🃏</span>
        {isOverLimit ? (
          <span>⚠️ 이벤트 한도 초과 (<span className="font-cinzel">{currentCount}/{currentLimit}</span>)</span>
        ) : (
          <span>이벤트 카드 (<span className="font-cinzel text-amber-400">{currentCount}</span><span className="font-cinzel text-amber-200/50 text-xs mx-0.5">/</span><span className="font-cinzel">{currentLimit}</span>)</span>
        )}
      </button>
    </div>
  );
}