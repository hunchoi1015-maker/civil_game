import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { getTechsByLevel } from '../../../constants/technologies';
import { validateTechResearch } from '../../../engine/TechValidator';
import { Technology, TechLevel } from '../../../types';
import { getAvailableTrade } from '../../../store/helpers/playerHelpers';
import clsx from 'clsx';

const LEVEL_COLORS: Record<TechLevel, string> = {
  1: 'border-green-500 bg-green-900/30',
  2: 'border-blue-500 bg-blue-900/30',
  3: 'border-purple-500 bg-purple-900/30',
  4: 'border-orange-500 bg-orange-900/30',
  5: 'border-red-500 bg-red-900/30',
};

const LEVEL_NAMES: Record<TechLevel, string> = {
  1: '고대',
  2: '고전',
  3: '중세',
  4: '산업',
  5: '현대',
};

// 7.5: 효과 타입별 아이콘
const EFFECT_ICONS: Record<string, string> = {
  trade: '💰',
  production: '🏭',
  culture: '🎨',
  military: '⚔️',
  special: '✨',
};

// 7.5: 해금 타입별 아이콘
const UNLOCK_ICONS: Record<string, string> = {
  building: '🏛️',
  government: '👑',
  armyTier: '🪖',
  ability: '⭐',
};

export function TechTree() {
  const { players, currentPlayerIndex, currentPhase, researchTech } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  // 연구 단계에서만 연구 가능
  const canResearch = currentPhase === 'research';

  const researchedIds = new Set(currentPlayer.technologies.map((t) => t.id));

  // 7.2: 사용 가능한 교역 자원 계산 (전체 - 화폐)
  const availableTrade = getAvailableTrade(currentPlayer);

  const handleResearch = (tech: Technology) => {
    const result = researchTech(currentPlayer.id, tech.id);
    if (result) {
      setSelectedTech(null);
    }
  };

  // 7.5: 유닛 진급 여부 확인
  const hasUnitUpgrade = (tech: Technology): boolean => {
    return tech.unlocks?.some((u) => u.type === 'armyTier') || false;
  };

  // 7.5: Tier 추출
  const getTierFromUnlockId = (unlockId: string): string | null => {
    const parts = unlockId.split('_');
    return parts.length === 2 ? `Tier ${parts[1]}` : null;
  };

  return (
    <div className="space-y-6">
      {/* 연구 단계 경고 */}
      {!canResearch && (
        <div className="p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ 연구 단계에서만 기술 연구가 가능합니다. 현재 단계에서는 기술을 확인만 할 수 있습니다.
          </p>
        </div>
      )}
      {canResearch && currentPlayer.hasResearchedThisTurn && (
        <div className="p-3 bg-blue-900/50 border border-blue-600 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 이번 턴의 기술 연구를 이미 완료했습니다. 다음 턴에 다시 연구할 수 있습니다.
          </p>
        </div>
      )}

      {/* 7.2: 플레이어 자원 정보 (사용 가능 교역 강조) */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-slate-300">
            <div className="text-xs text-slate-400 mb-1">전체 교역</div>
            <div className="text-xl font-bold text-amber-400">
              {currentPlayer.resources.trade}
            </div>
          </div>
          <div className="text-slate-300">
            <div className="text-xs text-slate-400 mb-1">화폐 (보존)</div>
            <div className="text-xl font-bold text-blue-400">
              {currentPlayer.resources.currency}
            </div>
          </div>
          <div className="text-slate-300 border-l-2 border-green-500 pl-4">
            <div className="text-xs text-slate-400 mb-1">사용 가능</div>
            <div className="text-2xl font-bold text-green-400">
              {availableTrade}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              (교역 - 화폐)
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-slate-400 mt-2">
          연구된 기술: {currentPlayer.technologies.length}개
        </div>
      </div>

      {/* 기술 트리 */}
      <div className="space-y-4">
        {([1, 2, 3, 4, 5] as TechLevel[]).map((level) => {
          const techs = getTechsByLevel(level);

          return (
            <div key={level} className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                {LEVEL_NAMES[level]} ({level}단계)
                {level > 1 && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    필요: {level - 1}단계 기술 {level - 1}개 이상
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {techs.map((tech) => {
                  const isResearched = researchedIds.has(tech.id);
                  const validation = validateTechResearch(
                    tech.id,
                    currentPlayer.technologies,
                    availableTrade // 7.2: 사용 가능한 교역으로 검증
                  );

                  return (
                    <motion.button
                      key={tech.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => !isResearched && setSelectedTech(tech)}
                      className={clsx(
                        'p-3 rounded-lg border-2 text-left transition-all relative',
                        LEVEL_COLORS[level],
                        isResearched && 'opacity-50 cursor-not-allowed',
                        !isResearched && validation.isValid && 'hover:brightness-110',
                        !isResearched && !validation.isValid && 'opacity-70',
                        selectedTech?.id === tech.id && 'ring-2 ring-white'
                      )}
                      disabled={isResearched}
                    >
                      {/* 7.5: 유닛 진급 배지 */}
                      {hasUnitUpgrade(tech) && !isResearched && (
                        <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          ⬆️
                        </div>
                      )}

                      <div className="font-medium text-white text-sm">{tech.name}</div>
                      <div className="text-xs text-slate-400 mt-1">비용: {tech.cost}</div>
                      {isResearched && (
                        <div className="text-xs text-green-400 mt-1">✓ 연구 완료</div>
                      )}

                      {/* 7.5: 간단한 효과 미리보기 */}
                      {!isResearched && tech.effects.length > 0 && (
                        <div className="text-xs text-blue-300 mt-1">
                          {tech.effects.map((e, i) => (
                            <span key={i}>{EFFECT_ICONS[e.type] || '📌'} </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 7.5: 선택된 기술 상세 정보 (개선) */}
      {selectedTech && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 w-96 bg-slate-800 rounded-lg p-5 shadow-xl border-2 border-slate-700"
        >
          <h4 className="text-xl font-bold text-white mb-2">{selectedTech.name}</h4>
          <p className="text-sm text-slate-400 mb-4">{selectedTech.description}</p>

          <div className="space-y-3 text-sm">
            {/* 비용 */}
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <div className="text-slate-300">
                <span className="text-amber-400 font-semibold">💰 비용:</span> {selectedTech.cost} 교역
              </div>
              <div className="text-xs text-slate-400 mt-1">
                (현재 사용 가능: {availableTrade})
              </div>
            </div>

            {/* 7.5: 효과 */}
            {selectedTech.effects.length > 0 && (
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="font-semibold text-blue-400 mb-2">📊 효과</div>
                {selectedTech.effects.map((effect, i) => (
                  <div key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span>{EFFECT_ICONS[effect.type] || '📌'}</span>
                    <span>{effect.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 7.5: 해금 */}
            {selectedTech.unlocks.length > 0 && (
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="font-semibold text-green-400 mb-2">🔓 해금</div>
                <div className="space-y-1">
                  {selectedTech.unlocks.map((unlock, i) => {
                    const tier = unlock.type === 'armyTier' ? getTierFromUnlockId(unlock.id) : null;
                    return (
                      <div key={i} className="text-slate-300 text-sm flex items-center gap-2">
                        <span>{UNLOCK_ICONS[unlock.type] || '🔓'}</span>
                        <span>{unlock.name}</span>
                        {tier && (
                          <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {tier}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7.5: 유닛 진급 정보 */}
            {hasUnitUpgrade(selectedTech) && (
              <div className="bg-orange-900/30 border border-orange-500 p-3 rounded-lg">
                <div className="text-orange-300 text-sm font-semibold flex items-center gap-2">
                  ⬆️ 하위 유닛 자동 진급
                </div>
                <div className="text-xs text-orange-200 mt-1">
                  연구 시 해당 타입의 모든 하위 티어 유닛이 자동으로 진급합니다
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleResearch(selectedTech)}
              disabled={
                !canResearch ||
                currentPlayer.hasResearchedThisTurn ||
                !validateTechResearch(
                  selectedTech.id,
                  currentPlayer.technologies,
                  availableTrade // 7.2: 사용 가능한 교역으로 검증
                ).isValid
              }
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {!canResearch
                ? '연구 단계가 아님'
                : currentPlayer.hasResearchedThisTurn
                ? '이번 턴 연구 완료'
                : `🔬 연구하기 (${selectedTech.cost} 교역)`}
            </button>
            <button
              onClick={() => setSelectedTech(null)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
            >
              취소
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}