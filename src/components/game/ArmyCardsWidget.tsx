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
  1: 'bg-slate-600',
  2: 'bg-green-700',
  3: 'bg-blue-700',
  4: 'bg-purple-700',
};

export function ArmyCardsWidget() {
  const { players, currentPlayerIndex,map } = useGameStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPlayer = players[currentPlayerIndex];
  
  // 🌟 [추가] 히메지성 보유 여부 판별
  const hasHimeji = map ? hasActiveWonder(currentPlayer.id, 'himeji_castle', map, players) : false;

  // 🌟 [수정] 원본 데이터를 훼손하지 않고, 렌더링용 배열에만 오라(버프)를 씌웁니다.
  // 이 배열을 밑에서 그대로 쓰기 때문에 총 공격력/체력 계산도 자동으로 올라갑니다!
  const displayArmyCards = currentPlayer.armyCards.map(card => 
      hasHimeji 
        ? { ...card, attack: card.attack + 1, maxHealth: card.maxHealth + 1, health: card.health + 1 }
        : card
  );

  // 🌟 기존 armyCards 대신 displayArmyCards를 사용하여 그룹화합니다.
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
    <div className="fixed bottom-4 left-4 z-40">
      {/* 접힌 상태: 요약 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white flex items-center gap-3 hover:bg-slate-700 transition-colors"
      >
        <span className="text-lg">⚔️</span>
        <div className="text-left">
          <div className="text-sm font-medium">부대 카드</div>
          <div className="text-xs text-slate-400">
            {totalCards}장 | 공격 {totalAttack} | 체력 {totalHealth}
          </div>
        </div>
        <span className={clsx('transition-transform', isExpanded && 'rotate-180')}>▲</span>
      </button>

      {/* 펼친 상태: 카드 목록 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mt-2 bg-slate-800 border border-slate-600 rounded-lg p-4 w-80 max-h-96 overflow-y-auto"
          >
            <h3 className="text-white font-semibold mb-3">나의 부대 카드</h3>

            {totalCards === 0 ? (
              <p className="text-slate-400 text-sm">보유한 부대 카드가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {/* 타입별 그룹 */}
                {Object.entries(groupedCards).map(([type, cards]) => {
                  const def = ARMY_CARD_DEFINITIONS[type as keyof typeof ARMY_CARD_DEFINITIONS];
                  const typeAttack = cards.reduce((sum, c) => sum + c.attack, 0);
                  const typeHealth = cards.reduce((sum, c) => sum + c.health, 0);

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{CARD_ICONS[type]}</span>
                        <span className="text-white font-medium">{def.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {cards.length}장 | 공{typeAttack} 체{typeHealth}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {cards.map((card) => (
                          <div
                            key={card.id}
                            className={clsx(
                              'p-2 rounded text-xs text-white',
                              TIER_COLORS[card.tier]
                            )}
                          >
                            <div className="font-medium truncate">{card.name}</div>
                            <div className="flex gap-2 text-[10px] opacity-80">
                              <span>T{card.tier}</span>
                              <span className="text-red-300">공{card.attack}</span>
                              <span className="text-green-300">체{card.health}/{card.maxHealth}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 전체 통계 */}
                <div className="pt-3 border-t border-slate-600">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-700 rounded p-2">
                      <div className="text-white font-semibold">{totalCards}</div>
                      <div className="text-slate-400">총 카드</div>
                    </div>
                    <div className="bg-red-900/50 rounded p-2">
                      <div className="text-red-400 font-semibold">{totalAttack}</div>
                      <div className="text-slate-400">총 공격</div>
                    </div>
                    <div className="bg-green-900/50 rounded p-2">
                      <div className="text-green-400 font-semibold">{totalHealth}</div>
                      <div className="text-slate-400">총 체력</div>
                    </div>
                  </div>
                </div>

                {/* 상성 정보 */}
                <div className="text-xs text-slate-500 pt-2">
                  <p>상성: 보병→기병→포병→보병 (선제공격)</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
