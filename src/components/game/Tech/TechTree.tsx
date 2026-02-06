import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { getTechsByLevel } from '../../../constants/technologies';
import { validateTechResearch } from '../../../engine/TechValidator';
import { Technology, TechLevel } from '../../../types';
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

export function TechTree() {
  const { players, currentPlayerIndex, currentPhase, researchTech } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  // 연구 단계에서만 연구 가능
  const canResearch = currentPhase === 'research';

  const researchedIds = new Set(currentPlayer.technologies.map((t) => t.id));

  const handleResearch = (tech: Technology) => {
    const result = researchTech(currentPlayer.id, tech.id);
    if (result) {
      setSelectedTech(null);
    }
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

      {/* 플레이어 자원 정보 */}
      <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
        <div className="text-slate-300">
          <span className="text-amber-400">교역 토큰:</span> {currentPlayer.resources.trade}/27
        </div>
        <div className="text-slate-300">
          <span className="text-blue-400">연구된 기술:</span> {currentPlayer.technologies.length}개
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
                    currentPlayer.resources.trade
                  );

                  return (
                    <motion.button
                      key={tech.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => !isResearched && setSelectedTech(tech)}
                      className={clsx(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        LEVEL_COLORS[level],
                        isResearched && 'opacity-50 cursor-not-allowed',
                        !isResearched && validation.isValid && 'hover:brightness-110',
                        !isResearched && !validation.isValid && 'opacity-70',
                        selectedTech?.id === tech.id && 'ring-2 ring-white'
                      )}
                      disabled={isResearched}
                    >
                      <div className="font-medium text-white text-sm">{tech.name}</div>
                      <div className="text-xs text-slate-400 mt-1">비용: {tech.cost}</div>
                      {isResearched && (
                        <div className="text-xs text-green-400 mt-1">✓ 연구 완료</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택된 기술 상세 정보 */}
      {selectedTech && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 w-80 bg-slate-800 rounded-lg p-4 shadow-xl border border-slate-700"
        >
          <h4 className="text-lg font-semibold text-white mb-2">{selectedTech.name}</h4>
          <p className="text-sm text-slate-400 mb-3">{selectedTech.description}</p>

          <div className="space-y-2 text-sm">
            <div className="text-slate-300">
              <span className="text-amber-400">비용:</span> {selectedTech.cost} 교역 토큰
            </div>

            {selectedTech.effects.map((effect, i) => (
              <div key={i} className="text-slate-300">
                <span className="text-blue-400">효과:</span> {effect.description}
              </div>
            ))}

            {selectedTech.unlocks.length > 0 && (
              <div className="text-slate-300">
                <span className="text-green-400">해금:</span>{' '}
                {selectedTech.unlocks.map((u) => u.name).join(', ')}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleResearch(selectedTech)}
              disabled={
                !canResearch ||
                currentPlayer.hasResearchedThisTurn ||
                !validateTechResearch(
                  selectedTech.id,
                  currentPlayer.technologies,
                  currentPlayer.resources.trade
                ).isValid
              }
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              {!canResearch ? '연구 단계가 아님' : currentPlayer.hasResearchedThisTurn ? '이번 턴 연구 완료' : '연구하기'}
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
