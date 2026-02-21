import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { TECHNOLOGIES } from '../../../constants/technologies';
import { validateTechResearch } from '../../../engine/TechValidator';
import { Technology, TechLevel } from '../../../types/tech'; 
import clsx from 'clsx';
import { getTechCountsByLevel } from '../../../store/helpers/playerHelpers';
import {TECH_COSTS} from '../../../types'

const LEVEL_COLORS: Record<TechLevel, string> = {
  1: 'border-emerald-500 bg-emerald-900/30 text-emerald-100',
  2: 'border-cyan-500 bg-cyan-900/30 text-cyan-100',
  3: 'border-blue-500 bg-blue-900/30 text-blue-100',
  4: 'border-purple-500 bg-purple-900/30 text-purple-100',
  5: 'border-amber-500 bg-amber-900/30 text-amber-100',
};

const LEVEL_NAMES: Record<TechLevel, string> = {
  1: '고대 (1단계)',
  2: '고전 (2단계)',
  3: '중세 (3단계)',
  4: '산업 (4단계)',
  5: '현대 (5단계)',
};

// 특정 레벨의 기술만 필터링하는 헬퍼 함수
const getTechsByLevel = (level: TechLevel) => TECHNOLOGIES.filter(t => t.level === level);

export function TechTree() {
  const { players, currentPlayerIndex, currentPhase, researchTech,endPhaseForCurrentPlayer } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const canResearch = currentPhase === 'research';

  const researchedIds = new Set(currentPlayer.technologies.map((t) => t.id));

  const handleResearch = (techId: string) => {
    if (!selectedTech) return;

    // 🌟 1. UI에서 먼저 교역 토큰이 충분한지 계산합니다.
    const cost = TECH_COSTS[selectedTech.level] || 0;
    const availableTrade = Math.max(0, currentPlayer.resources.trade - currentPlayer.resources.currency);

    // 🌟 2. 모자라다면 경고창을 띄우고 함수를 그 자리에서 종료(return)합니다!
    if (availableTrade < cost) {
      alert(`사용 가능한 교역 토큰이 부족합니다. (비용: ${cost}, 사용 가능: ${availableTrade})`);
      return; // ⛔ 여기서 멈추기 때문에 다음 사람 턴으로 넘어가지 않습니다!
    }

    // 🌟 3. 충분할 때만 실제 연구를 진행하고 차례를 마칩니다.
    researchTech(techId);
    setSelectedTech(null);
    endPhaseForCurrentPlayer();
  };

  return (
    <div className="space-y-6 pb-32 max-h-[80vh] overflow-y-auto overflow-x-hidden pr-2">
      {/* 상단 안내 바 */}
      <div className="bg-slate-800 rounded-lg p-4 flex justify-between items-center shadow-lg border border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">기술 피라미드</h2>
          <p className="text-sm text-slate-400">
            상위 기술을 연구하려면, 그보다 1단계 낮은 기술이 항상 1개 더 많아야 합니다.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">현재 보유 기술</div>
          <div className="text-2xl font-bold text-amber-400">{currentPlayer.technologies.length}개</div>
        </div>
        {/* 연구 건너뛰기 버튼 */}
          {canResearch && (
            <button 
              onClick={() => endPhaseForCurrentPlayer()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-white text-sm font-bold transition-colors"
            >
              연구 건너뛰기 ⏩
            </button>
          )}
      </div>

      {/* 기술 트리 피라미드 렌더링 (5단계부터 1단계 순으로 역순 렌더링 하면 피라미드 모양이 됩니다) */}
      <div className="space-y-6 flex flex-col items-center">
        {([5, 4, 3, 2, 1] as TechLevel[]).map((level) => {
          const techs = getTechsByLevel(level);
          const techCounts = getTechCountsByLevel(currentPlayer);

              return (
                <div key={level} className="w-full max-w-5xl bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-bold text-slate-300 mb-3 text-center">
                    {LEVEL_NAMES[level]}
                    {level > 1 && (
                      <span className="text-xs font-normal text-slate-500 ml-2">
                        {/* 🌟 수정: 조건 텍스트를 정확한 개수(+2)로 표시합니다. */}
                        (조건: {level - 1}단계 기술 {techCounts[level] + 2}개 이상 필요)
                      </span>
                    )}
                  </h3>

              <div className="flex flex-wrap justify-center gap-3">
                {techs.map((tech) => {
                  const isResearched = researchedIds.has(tech.id);
                  // 새로 만든 검증 함수 사용 (비용 검증 파라미터 삭제됨)
                  const validation = validateTechResearch(tech.id, currentPlayer.technologies,0);

                  return (
                    <motion.button
                      key={tech.id}
                      whileHover={!isResearched ? { scale: 1.05 } : {}}
                      onClick={() => setSelectedTech(tech)}
                      className={clsx(
                        'w-40 p-3 rounded-xl border-2 text-left transition-all relative shadow-md flex flex-col justify-between h-24',
                        LEVEL_COLORS[level],
                        isResearched && 'opacity-100 ring-2 ring-amber-400 scale-95 border-amber-500', // 연구 완료 강조
                        !isResearched && validation.isValid && 'hover:brightness-125 cursor-pointer',
                        !isResearched && !validation.isValid && 'opacity-40 grayscale cursor-not-allowed',
                        selectedTech?.id === tech.id && 'ring-4 ring-white z-10'
                      )}
                    >
                      <div className="font-bold text-sm leading-tight">{tech.name}</div>
                      
                      {isResearched ? (
                        <div className="text-xs font-bold text-amber-300 mt-auto text-right">✓ 보유중</div>
                      ) : !validation.isValid ? (
                        <div className="text-[10px] text-slate-300 mt-auto text-right">🔒 조건 부족</div>
                      ) : (
                        <div className="text-[10px] font-bold text-green-300 mt-auto text-right">✨ 연구 가능</div>
                      )}
                      
                      {/* 고유 기술 뱃지 */}
                      {tech.isStartingTechFor && (
                        <div className="absolute -top-2 -right-2 text-lg">⭐</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택된 기술 상세 정보 모달 */}
      <AnimatePresence>
        {selectedTech && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[500px] bg-slate-900 rounded-2xl p-6 shadow-2xl border-2 border-slate-600 z-50"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-2xl font-bold text-white flex items-center gap-2">
                  {selectedTech.name}
                  <span className={clsx("text-xs px-2 py-1 rounded-full font-bold", LEVEL_COLORS[selectedTech.level].split(' ')[1])}>
                    Lv.{selectedTech.level}
                  </span>
                </h4>
              </div>
              <button onClick={() => setSelectedTech(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 mb-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border border-slate-700">
              {selectedTech.description}
            </div>

            {/* 상세 효과 아이콘 요약 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedTech.unlocksBuildings && <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-700">🏛️ 건물 해금</span>}
              {selectedTech.upgradesBuilding && <span className="bg-emerald-900/50 text-emerald-300 text-xs px-2 py-1 rounded border border-emerald-700">🏗️ 건물 자동개량</span>}
              {selectedTech.upgradesUnit && <span className="bg-orange-900/50 text-orange-300 text-xs px-2 py-1 rounded border border-orange-700">⚔️ 부대 자동진급</span>}
              {selectedTech.unlocksGovernment && <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded border border-purple-700">👑 정치체제</span>}
              {selectedTech.resourceAbility && <span className="bg-amber-900/50 text-amber-300 text-xs px-2 py-1 rounded border border-amber-700">💡 1턴 1회 자원능력</span>}
            </div>

            {/* 하단 버튼 영역 */}
            <div className="flex gap-3">
              {researchedIds.has(selectedTech.id) ? (
                <button disabled className="flex-1 py-3 bg-slate-700 text-amber-400 font-bold rounded-xl cursor-not-allowed">
                  이미 보유한 기술입니다
                </button>
              ) : (
                <button
                  onClick={() => handleResearch(selectedTech.id)}
                  disabled={!canResearch || !validateTechResearch(selectedTech.id, currentPlayer.technologies,0).isValid}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  {!canResearch 
                    ? '현재 연구 가능한 단계가 아닙니다' 
                    : !validateTechResearch(selectedTech.id, currentPlayer.technologies,0).isValid
                      ? '피라미드 하위 조건이 부족합니다'
                      : '🔬 이 기술 연구하기'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}