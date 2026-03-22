// src/components/game/ArmyCardsWidget.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { ArmyCard, ARMY_CARD_DEFINITIONS } from '../../types';
import clsx from 'clsx';
import { hasActiveWonder } from '../../store/helpers/playerHelpers';

const CARD_ICONS: Record<string, string> = {
  infantry: '🗡️',
  artillery: '💣',
  cavalry: '🐴',
  airforce: '✈️',
};

const TIER_COLORS = {
  1: 'bg-slate-800 border-slate-500 text-slate-300',
  2: 'bg-green-950/80 border-green-700/80 text-green-200',
  3: 'bg-blue-950/80 border-blue-700/80 text-blue-200',
  4: 'bg-purple-950/80 border-purple-700/80 text-purple-200',
};

export function ArmyCardsWidget() {
  const { players, currentPlayerIndex, map } = useGameStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  
  const hasHimeji = map ? hasActiveWonder(currentPlayer.id, 'himeji_castle', map, players) : false;

  const displayArmyCards = currentPlayer.armyCards.map(card => 
      hasHimeji 
        ? { ...card, attack: card.attack + 1, maxHealth: card.maxHealth + 1, health: card.health + 1 }
        : card
  );

  const groupedCards = displayArmyCards.reduce((acc, card) => {
    if (!acc[card.type]) {
      acc[card.type] = [];
    }
    acc[card.type].push(card);
    return acc;
  }, {} as Record<string, ArmyCard[]>);

  const totalCards = displayArmyCards.length;
  const totalAttack = displayArmyCards.reduce((sum, c) => sum + c.attack, 0);
  const totalHealth = displayArmyCards.reduce((sum, c) => sum + c.health, 0);

  return (
    // 🌟 [수정] fixed left-6 제거, relative로 변경하여 GameScreen의 컨테이너 설정을 따르게 함
    <div className="relative flex flex-col items-end font-serif z-40">
      
      {/* 🌟 [수정] 팝업 창을 버튼보다 먼저 렌더링하고, absolute bottom-full 속성으로 위로 열리게 수정 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full mb-4 right-0 panel-texture rounded-xl p-5 w-[340px] max-h-[26rem] overflow-y-auto custom-scrollbar origin-bottom-right"
          >
            <div className="panel-content">
              <h3 className="text-xl font-black text-amber-400 text-glow-gold mb-4 border-b border-amber-700/30 pb-2">⚔️ 나의 부대 카드</h3>

              {totalCards === 0 ? (
                <p className="text-amber-200/50 text-sm text-center py-4 italic">보유한 부대 카드가 없습니다.</p>
              ) : (
                <div className="space-y-5">
                  {/* 타입별 그룹 */}
                  {Object.entries(groupedCards).map(([type, cards]) => {
                    const def = ARMY_CARD_DEFINITIONS[type as keyof typeof ARMY_CARD_DEFINITIONS];
                    const typeAttack = cards.reduce((sum, c) => sum + c.attack, 0);
                    const typeHealth = cards.reduce((sum, c) => sum + c.health, 0);

                    return (
                      <div key={type}>
                        <div className="flex items-center gap-2 mb-2 border-b border-amber-900/30 pb-1">
                          <span className="text-lg filter drop-shadow-md">{CARD_ICONS[type]}</span>
                          <span className="text-amber-100 font-bold">{def.name}</span>
                          <span className="text-[10px] text-amber-200/60 ml-auto bg-slate-950/50 px-1 py-0.5 rounded border border-amber-900/50">
                            <span className="font-cinzel font-bold">{cards.length}</span>장 | 
                            공<span className="font-cinzel font-bold text-red-300 ml-0.5">{typeAttack}</span> 
                            체<span className="font-cinzel font-bold text-green-300 ml-0.5">{typeHealth}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {cards.map((card) => (
                            <div
                              key={card.id}
                              className={clsx(
                                'p-2.5 rounded-lg text-xs border shadow-sm transition-all hover:brightness-110',
                                TIER_COLORS[card.tier as keyof typeof TIER_COLORS]
                              )}
                            >
                              <div className="font-bold truncate mb-1 text-shadow-sm">{card.name}</div>
                              <div className="flex justify-between items-center bg-black/40 px-1.5 py-1 rounded">
                                <span className="font-cinzel font-bold text-amber-300 drop-shadow">T{card.tier}</span>
                                <div className="flex gap-1.5">
                                  <span className="text-red-300 font-cinzel font-bold">⚔️{card.attack}</span>
                                  <span className="text-green-300 font-cinzel font-bold">❤️{card.health}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* 전체 통계 */}
                  <div className="pt-4 border-t border-amber-700/30">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/80 rounded border border-slate-700 p-2 shadow-inner">
                        <div className="font-cinzel text-amber-100 font-bold text-lg text-glow-gold">{totalCards}</div>
                        <div className="text-amber-200/60 mt-1">총 부대 수</div>
                      </div>
                      <div className="bg-red-950/60 rounded border border-red-900/50 p-2 shadow-inner">
                        <div className="font-cinzel text-red-400 font-bold text-lg text-shadow-[0_0_8px_rgba(248,113,113,0.5)]">{totalAttack}</div>
                        <div className="text-amber-200/60 mt-1">총 화력</div>
                      </div>
                      <div className="bg-green-950/60 rounded border border-green-900/50 p-2 shadow-inner">
                        <div className="font-cinzel text-green-400 font-bold text-lg text-shadow-[0_0_8px_rgba(74,222,128,0.5)]">{totalHealth}</div>
                        <div className="text-amber-200/60 mt-1">총 내구도</div>
                      </div>
                    </div>
                  </div>

                  {/* 상성 정보 */}
                  <div className="text-[10px] text-amber-200/50 pt-2 text-center bg-slate-950/50 rounded py-1.5 border border-slate-800">
                    <p>🔄 상성: 보병 → 기병 → 포병 → 보병 (선제공격)</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 [수정] 항상 맨 아래에 렌더링 되는 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-slate-900 border border-amber-700/50 rounded-xl px-2 py-1 text-amber-50 flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:shadow-glow-gold group"
      >
        <span className="text-xl drop-shadow-md group-hover:scale-110 transition-transform">⚔️</span>
        <div className="text-left">
          <div className="text-xs font-bold text-amber-400 text-glow-gold">보유 부대 카드</div>
          <div className="text-[10px] text-amber-200/60 mt-0.5">
            <span className="font-cinzel text-amber-100 font-bold">{totalCards}</span>장 | 
            공격 <span className="font-cinzel text-amber-100 font-bold">{totalAttack}</span> | 
            체력 <span className="font-cinzel text-amber-100 font-bold">{totalHealth}</span>
          </div>
        </div>
        <span className={clsx('transition-transform text-amber-500 ml-1 text-xs', isExpanded && 'rotate-180')}>▲</span>
      </button>

    </div>
  );
}