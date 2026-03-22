import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { TECHNOLOGIES } from '../../../constants/technologies';
import { Technology, TechLevel } from '../../../types/tech'; 
import clsx from 'clsx';
// 🌟 통합 헬퍼 함수 임포트
import { canLearnTechInPyramid, getEffectiveTechLevel } from '../../../store/helpers/validationHelpers';
import { TECH_COSTS } from '../../../types';

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
  const { players, currentPlayerIndex, currentPhase, researchTech, endPhaseForCurrentPlayer,addToast } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const canResearch = currentPhase === 'research';

  const researchedIds = new Set(currentPlayer.technologies.map((t) => t.id));

  const handleResearch = (techId: string) => {
    if (!selectedTech) return;

    // 1. UI에서 먼저 교역 토큰이 충분한지 계산합니다.
    const cost = TECH_COSTS[selectedTech.level] || 0;
    const availableTrade = Math.max(0, currentPlayer.resources.trade - currentPlayer.resources.currency);

    // 2. 모자라다면 경고창을 띄우고 함수를 그 자리에서 종료(return)합니다!
    if (availableTrade < cost) {
      addToast(`사용 가능한 교역 토큰이 부족합니다. (비용: ${cost}, 사용 가능: ${availableTrade})`);
      return; 
    }

    // 3. 충분할 때만 실제 연구를 진행하고 차례를 마칩니다.
    researchTech(techId);
    setSelectedTech(null);
  };

  return (
    <div className="space-y-8 pb-32 max-h-[80vh] overflow-y-auto custom-scrollbar overflow-x-hidden pr-4">
      
      {/* 🌟 상단 안내 바 (양피지 텍스처 및 세리프 폰트) */}
      <div className="panel-texture rounded-xl p-6 flex flex-wrap gap-4 justify-between items-center shadow-lg">
        <div className="panel-content flex-1">
          <h2 className="text-3xl font-serif font-black text-amber-400 text-glow-gold mb-2">
            🔬 기술 피라미드
          </h2>
          <p className="text-sm font-serif text-amber-200/70">
            문명의 발전을 이끄는 기술 트리입니다. 상위 기술을 연구하려면,<br/>
            <span className="text-amber-300">그보다 1단계 낮은 기술이 항상 1개 더 많아야 합니다.</span>
          </p>
        </div>
        <div className="panel-content text-right flex items-center gap-6 border-l border-amber-700/30 pl-6">
          <div>
            <div className="text-xs font-serif text-amber-200/60 mb-1">현재 보유 기술</div>
            <div className="text-3xl font-cinzel font-bold text-amber-400 text-glow-gold">
              {currentPlayer.technologies.length}<span className="text-sm font-serif text-amber-200/50 ml-1">개</span>
            </div>
          </div>
          {/* 연구 건너뛰기 버튼 */}
          {canResearch && (
            <button 
              onClick={() => endPhaseForCurrentPlayer()}
              className="px-5 py-3 bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-500 hover:border-amber-500 rounded-lg text-slate-300 hover:text-amber-100 text-sm font-serif font-bold transition-all shadow-md"
            >
              연구 건너뛰기 ⏩
            </button>
          )}
        </div>
      </div>

      {/* 🌟 기술 트리 피라미드 렌더링 */}
      <div className="space-y-6 flex flex-col items-center">
        {([5, 4, 3, 2, 1] as TechLevel[]).map((level) => {
          const techs = getTechsByLevel(level);
          const currentLevelCount = currentPlayer.technologies.filter(
              t => getEffectiveTechLevel(currentPlayer.nation, t.id) === level
          ).length;

          return (
            <div key={level} className="w-full max-w-5xl bg-slate-900/60 rounded-2xl p-5 border border-amber-700/30 shadow-inner relative">
              <h3 className="text-xl font-serif font-bold text-amber-500 mb-4 text-center border-b border-amber-900/50 pb-2">
                {LEVEL_NAMES[level]}
                {level > 1 && (
                  <span className="text-[11px] font-normal text-amber-200/50 ml-3">
                    (연구 조건: {level - 1}단계 기술 <span className="font-cinzel text-amber-300">{currentLevelCount + 2}</span>개 이상 필요)
                  </span>
                )}
              </h3>

              <div className="flex flex-wrap justify-center gap-4">
                {techs.map((tech) => {
                  const playerTech = currentPlayer.technologies.find(t => t.id === tech.id);
                  const isResearched = researchedIds.has(tech.id);
                  const validation = canLearnTechInPyramid(currentPlayer, tech.id);

                  return (
                    <motion.button
                      key={tech.id}
                      whileHover={!isResearched && validation.canResearch ? { scale: 1.05, y: -2 } : {}}
                      onClick={() => setSelectedTech(tech)}
                      className={clsx(
                        'w-40 p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between h-24 font-serif',
                        LEVEL_COLORS[level],
                        isResearched 
                          ? 'opacity-100 bg-amber-900/40 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)] transform scale-[0.98]' 
                          : validation.canResearch 
                            ? 'hover:brightness-125 hover:border-amber-400 cursor-pointer shadow-md' 
                            : 'opacity-40 grayscale border-slate-700 bg-slate-800 cursor-not-allowed',
                        selectedTech?.id === tech.id && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 z-10'
                      )}
                    >
                      <div className="font-bold text-sm leading-tight drop-shadow-md">{tech.name}</div>
                      
                      {isResearched ? (
                        <div className="text-[11px] font-bold text-amber-400 mt-auto text-right text-glow-gold">✓ 보유중</div>
                      ) : !validation.canResearch ? (
                        <div className="text-[10px] text-slate-400 mt-auto text-right">🔒 조건 부족</div>
                      ) : (
                        <div className="text-[11px] font-bold text-emerald-400 mt-auto text-right">✨ 연구 가능</div>
                      )}
                      
                      {/* 고유 기술 뱃지 */}
                      {tech.isStartingTechFor && (
                        <div className="absolute -top-2 -right-2 text-lg drop-shadow-md" title={`${tech.isStartingTechFor} 문명의 시작 기술`}>⭐</div>
                      )}

                      {/* 화폐 토큰 뱃지 */}
                      {isResearched && tech.resourceAbility?.maxTokens && (
                        <div className="absolute -top-3 -left-3 bg-slate-950 border-2 border-amber-500 rounded-full px-2 py-0.5 text-xs font-bold text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] z-20 flex items-center gap-1">
                          <span className="text-[10px]">💰</span>
                          <span className="font-cinzel">{playerTech?.tokensOnCard || 0}/{tech.resourceAbility.maxTokens}</span>
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

      {/* 🌟 선택된 기술 상세 정보 모달 (양피지/보드게임 룰북 테마) */}
      <AnimatePresence>
        {selectedTech && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="panel-texture w-full max-w-lg rounded-2xl p-7 shadow-2xl border-amber-500/50"
            >
              <div className="panel-content">
                <div className="flex justify-between items-start mb-5 border-b border-amber-700/30 pb-4">
                  <div>
                    <h4 className="text-3xl font-serif font-black text-amber-400 text-glow-gold flex items-center gap-3">
                      {selectedTech.name}
                      <span className="text-sm px-2.5 py-0.5 rounded border border-amber-600/50 bg-amber-900/30 text-amber-200 font-cinzel">
                        Lv.{selectedTech.level}
                      </span>
                    </h4>
                  </div>
                  <button onClick={() => setSelectedTech(null)} className="text-slate-400 hover:text-amber-400 text-2xl transition-colors">✕</button>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-5 mb-5 text-sm text-amber-100/90 leading-relaxed whitespace-pre-wrap border border-amber-900/50 font-serif shadow-inner">
                  {selectedTech.description}
                </div>

                {/* 상세 효과 아이콘 요약 */}
                <div className="flex flex-wrap gap-2 mb-6 font-serif">
                  {selectedTech.unlocksBuildings && <span className="bg-blue-950/60 text-blue-300 text-xs px-2.5 py-1.5 rounded border border-blue-800 shadow-sm">🏛️ 건물 해금</span>}
                  {selectedTech.upgradesBuilding && <span className="bg-emerald-950/60 text-emerald-300 text-xs px-2.5 py-1.5 rounded border border-emerald-800 shadow-sm">🏗️ 건물 자동개량</span>}
                  {selectedTech.upgradesUnit && <span className="bg-orange-950/60 text-orange-300 text-xs px-2.5 py-1.5 rounded border border-orange-800 shadow-sm">⚔️ 부대 자동진급</span>}
                  {selectedTech.unlocksGovernment && <span className="bg-purple-950/60 text-purple-300 text-xs px-2.5 py-1.5 rounded border border-purple-800 shadow-sm">👑 정치체제 해금</span>}
                  {selectedTech.resourceAbility && <span className="bg-amber-950/60 text-amber-300 text-xs px-2.5 py-1.5 rounded border border-amber-800 shadow-sm">💡 1턴 1회 능력</span>}
                </div>

                {/* 하단 버튼 영역 */}
                <div className="flex gap-3 mt-2 pt-4 border-t border-amber-700/30">
                  {researchedIds.has(selectedTech.id) ? (
                    <button disabled className="w-full py-4 bg-slate-800/80 border border-slate-600 text-amber-500/60 font-serif font-bold rounded-xl cursor-not-allowed shadow-inner">
                      이미 보유한 기술입니다
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResearch(selectedTech.id)}
                      disabled={!canResearch || !canLearnTechInPyramid(currentPlayer, selectedTech.id).canResearch}
                      className={clsx(
                        "w-full py-4 font-serif font-bold rounded-xl transition-all text-base shadow-md border",
                        (!canResearch || !canLearnTechInPyramid(currentPlayer, selectedTech.id).canResearch)
                          ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 border-amber-400 text-amber-50 shadow-glow-gold transform hover:scale-[1.02]"
                      )}
                    >
                      {!canResearch 
                        ? '현재 연구 가능한 단계가 아닙니다' 
                        : !canLearnTechInPyramid(currentPlayer, selectedTech.id).canResearch
                          ? '피라미드 하위 조건이 부족합니다'
                          : '🔬 이 기술 연구하기 (교역 토큰 소모)'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}