import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { ArmyCard, ARMY_CARD_DEFINITIONS, FRONTLINE_SIZE, LOOT_AMOUNT } from '../../../types';
import { resolveCombat, CombatSetup } from '../../../engine/CombatResolver';
import clsx from 'clsx';

const CARD_ICONS: Record<string, string> = {
  infantry: '🗡️',
  artillery: '💣',
  cavalry: '🐴',
  airforce: '✈️',
};

export function CombatPanel() {
  const { combatState, players, endCombat, addCulture, addTrade } = useGameStore();
  const [phase, setPhase] = useState<'setup' | 'battle' | 'result'>('setup');
  const [selectedAttackerCards, setSelectedAttackerCards] = useState<ArmyCard[]>([]);
  const [selectedDefenderCards, setSelectedDefenderCards] = useState<ArmyCard[]>([]);
  const [combatResult, setCombatResult] = useState<ReturnType<typeof resolveCombat> | null>(null);
  const [lootChoice, setLootChoice] = useState<'trade' | 'culture' | null>(null);

  const attacker = players.find((p) => p.id === combatState.attackerId);
  const defender = players.find((p) => p.id === combatState.defenderId);

  if (!attacker || !defender) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white">전투 정보를 불러올 수 없습니다.</p>
        <button onClick={endCombat} className="ml-4 px-4 py-2 bg-red-600 text-white rounded">
          닫기
        </button>
      </div>
    );
  }

  const handleSelectAttackerCard = (card: ArmyCard) => {
    if (phase !== 'setup') return;

    if (selectedAttackerCards.some((c) => c.id === card.id)) {
      setSelectedAttackerCards(selectedAttackerCards.filter((c) => c.id !== card.id));
    } else if (selectedAttackerCards.length < FRONTLINE_SIZE) {
      setSelectedAttackerCards([...selectedAttackerCards, card]);
    }
  };

  const handleSelectDefenderCard = (card: ArmyCard) => {
    if (phase !== 'setup') return;

    if (selectedDefenderCards.some((c) => c.id === card.id)) {
      setSelectedDefenderCards(selectedDefenderCards.filter((c) => c.id !== card.id));
    } else if (selectedDefenderCards.length < FRONTLINE_SIZE) {
      setSelectedDefenderCards([...selectedDefenderCards, card]);
    }
  };

  // 도시 전투 보너스 계산
  const getPlayerCombatBonus = (player: typeof attacker) => {
    let bonus = player.resources.combatBonus;
    for (const city of player.cities) {
      bonus += city.combatBonus;
    }
    return bonus;
  };

  const handleStartBattle = () => {
    if (selectedAttackerCards.length === 0 || selectedDefenderCards.length === 0) {
      alert('양측 모두 전선에 카드를 배치해야 합니다.');
      return;
    }

    setPhase('battle');

    // 전투 해결
    const setup: CombatSetup = {
      attackerCards: selectedAttackerCards.map(c => ({ ...c })),
      defenderCards: selectedDefenderCards.map(c => ({ ...c })),
      attackerBonus: getPlayerCombatBonus(attacker),
      defenderBonus: getPlayerCombatBonus(defender),
    };

    const result = resolveCombat(setup);
    setCombatResult(result);
    setPhase('result');
  };

  const handleSelectLoot = (choice: 'trade' | 'culture') => {
    setLootChoice(choice);
  };

  const handleEndCombat = () => {
    if (combatResult && combatResult.winner === 'attacker' && lootChoice) {
      // 전리품 적용
      if (lootChoice === 'trade') {
        addTrade(attacker.id, LOOT_AMOUNT);
      } else if (lootChoice === 'culture') {
        addCulture(attacker.id, LOOT_AMOUNT);
      }
    }
    endCombat();
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500 mb-2">전투!</h1>
          <p className="text-slate-400">
            {attacker.name} vs {defender.name}
          </p>
        </div>

        {phase === 'setup' && (
          <div className="grid grid-cols-2 gap-8">
            {/* 공격자 */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-400 mb-4">
                ⚔️ {attacker.name} (공격)
              </h2>
              <p className="text-sm text-slate-400 mb-2">
                전선에 배치할 카드를 선택하세요 (최대 {FRONTLINE_SIZE}장)
              </p>
              <p className="text-xs text-amber-400 mb-4">
                전투 보너스: +{getPlayerCombatBonus(attacker)}
              </p>

              <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto">
                {attacker.armyCards.length === 0 ? (
                  <p className="text-slate-500">보유한 부대 카드가 없습니다.</p>
                ) : (
                  attacker.armyCards.map((card) => {
                    const isSelected = selectedAttackerCards.some((c) => c.id === card.id);
                    const def = ARMY_CARD_DEFINITIONS[card.type];

                    return (
                      <button
                        key={card.id}
                        onClick={() => handleSelectAttackerCard(card)}
                        className={clsx(
                          'w-full p-3 rounded-lg text-left transition-colors',
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CARD_ICONS[card.type]}</span>
                          <div className="flex-1">
                            <div className="font-medium">{card.name}</div>
                            <div className="text-xs opacity-75">
                              <span className="text-red-300">공격: {card.attack}</span>
                              <span className="mx-1">|</span>
                              <span className="text-green-300">체력: {card.health}/{card.maxHealth}</span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {def.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="bg-slate-700 rounded p-3">
                <p className="text-sm text-slate-400">선택된 카드: {selectedAttackerCards.length}/{FRONTLINE_SIZE}</p>
              </div>
            </div>

            {/* 방어자 */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-400 mb-4">
                🛡️ {defender.name} (방어)
              </h2>
              <p className="text-sm text-slate-400 mb-2">
                방어에 사용할 카드를 선택하세요 (최대 {FRONTLINE_SIZE}장)
              </p>
              <p className="text-xs text-amber-400 mb-4">
                전투 보너스: +{getPlayerCombatBonus(defender)}
              </p>

              <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto">
                {defender.armyCards.length === 0 ? (
                  <p className="text-slate-500">보유한 부대 카드가 없습니다.</p>
                ) : (
                  defender.armyCards.map((card) => {
                    const isSelected = selectedDefenderCards.some((c) => c.id === card.id);
                    const def = ARMY_CARD_DEFINITIONS[card.type];

                    return (
                      <button
                        key={card.id}
                        onClick={() => handleSelectDefenderCard(card)}
                        className={clsx(
                          'w-full p-3 rounded-lg text-left transition-colors',
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CARD_ICONS[card.type]}</span>
                          <div className="flex-1">
                            <div className="font-medium">{card.name}</div>
                            <div className="text-xs opacity-75">
                              <span className="text-red-300">공격: {card.attack}</span>
                              <span className="mx-1">|</span>
                              <span className="text-green-300">체력: {card.health}/{card.maxHealth}</span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {def.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="bg-slate-700 rounded p-3">
                <p className="text-sm text-slate-400">선택된 카드: {selectedDefenderCards.length}/{FRONTLINE_SIZE}</p>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && combatResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-lg p-8 text-center"
          >
            <h2 className="text-3xl font-bold mb-4">
              {combatResult.winner === 'attacker' && (
                <span className="text-red-400">🏆 {attacker.name} 승리!</span>
              )}
              {combatResult.winner === 'defender' && (
                <span className="text-blue-400">🏆 {defender.name} 승리!</span>
              )}
            </h2>

            <div className="grid grid-cols-2 gap-8 my-8">
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">{attacker.name}</h3>
                <p className="text-slate-400">
                  점수: {combatResult.attackerScore}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">{defender.name}</h3>
                <p className="text-slate-400">
                  점수: {combatResult.defenderScore}
                </p>
              </div>
            </div>

            {combatResult.winner === 'attacker' && (
              <div className="bg-slate-700 rounded-lg p-4 mb-8">
                <h4 className="text-lg font-semibold text-amber-400 mb-4">전리품 선택</h4>
                <p className="text-slate-300 mb-4">
                  승리 보상으로 {LOOT_AMOUNT}을 선택하세요:
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleSelectLoot('trade')}
                    className={clsx(
                      'px-6 py-3 rounded-lg font-semibold transition-colors',
                      lootChoice === 'trade'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    )}
                  >
                    교역 +{LOOT_AMOUNT}
                  </button>
                  <button
                    onClick={() => handleSelectLoot('culture')}
                    className={clsx(
                      'px-6 py-3 rounded-lg font-semibold transition-colors',
                      lootChoice === 'culture'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    )}
                  >
                    문화 +{LOOT_AMOUNT}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-center gap-4 mt-8">
          {phase === 'setup' && (
            <>
              <button
                onClick={handleStartBattle}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
              >
                전투 시작!
              </button>
              <button
                onClick={endCombat}
                className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
              >
                철수
              </button>
            </>
          )}

          {phase === 'result' && (
            <button
              onClick={handleEndCombat}
              disabled={combatResult?.winner === 'attacker' && !lootChoice}
              className={clsx(
                'px-8 py-3 font-semibold rounded-lg transition-colors',
                combatResult?.winner === 'attacker' && !lootChoice
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              )}
            >
              전투 종료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
