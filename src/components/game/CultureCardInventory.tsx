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
    <>
      
      {/* 하단 우측 플로팅 인벤토리 */}
      <div className="relative flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full mb-4 right-0 bg-slate-800 border-2 border-purple-500/50 rounded-xl p-4 w-[340px] shadow-2xl flex flex-col gap-3 origin-bottom-right z-50"
            >
              <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
                <h4 className="text-purple-300 font-bold">보유한 이벤트 카드</h4>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {/* 🌟 한도 초과 경고 메시지 */}
              {isOverLimit && (
                <div className="bg-red-900/60 border border-red-500 rounded p-3 text-xs text-white mb-2 shadow-inner">
                  <span className="font-bold text-red-400 text-sm">⚠️ 사용 불가 (한도 초과)</span><br/>
                  현재 <span className="text-amber-400 font-bold">{currentCount} / {currentLimit}장</span> 입니다.<br/>
                  우측 휴지통(🗑️)을 눌러 카드를 버려야만 다른 카드를 사용할 수 있습니다.
                </div>
              )}

              <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                {player.cultureEventCards?.map(card => (
                  <div key={card.id} className="flex gap-2">
                    
                    {/* 카드 본체 (초과 시 클릭 불가능하게 어둡게 처리) */}
                    <button 
                      onClick={() => {
                        if (isOverLimit) {
                            addToast(`보유 한도를 초과했습니다. 휴지통을 눌러 카드를 버려주세요.`);
                            return;
                        }
                        startCardTargeting(card.id);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "flex-1 p-3 rounded text-left transition-all group border",
                        isOverLimit 
                          ? "bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed" 
                          : "bg-slate-700 hover:bg-purple-900/40 border-slate-600 hover:border-purple-500"
                      )}
                    >
                      <div className="text-white font-bold mb-1 flex justify-between">
                        <span>{card.name}</span>
                        <span className="text-[10px] bg-purple-600 px-2 py-0.5 rounded-full h-fit">Lv.{card.level}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-tight">{card.description}</div>
                    </button>

                    {/* 🌟 휴지통 버튼 (항상 활성화) */}
                    <button
                      onClick={() => discardCultureCard(card.id)}
                      className="w-10 flex items-center justify-center bg-slate-700 hover:bg-red-600 border border-slate-600 hover:border-red-500 rounded transition-colors text-lg"
                      title="카드 버리기"
                    >
                      🗑️
                    </button>

                  </div>
                ))}
              </div>
              
              {currentCount === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6">보유한 카드가 없습니다.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🌟 메인 토글 버튼 상태 표시 */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            "px-6 py-3 rounded-full font-bold shadow-lg transition-transform flex items-center gap-2 whitespace-nowrap",
            isOverLimit 
              ? "bg-red-900 hover:bg-red-800 text-red-200 border-2 border-red-500 shadow-red-900/50 animate-pulse" 
              : "bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-purple-900/50 border border-purple-400/30 hover:scale-105"
          )}
        >
          <span className="text-xl">🃏</span>
          {isOverLimit ? (
            <span>⚠️ 이벤트 카드 잠김 ({currentCount}/{currentLimit})</span>
          ) : (
            <span>이벤트 카드 ({currentCount}/{currentLimit})</span>
          )}
        </button>
      </div>
    </>
  );
}