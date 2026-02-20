import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function TechAbilityWidget() {
  const { players, currentPlayerIndex, useTechResourceAbility, currentPhase } = useGameStore();
  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);

  // 현재 플레이어가 가진 기술 중 '자원 능력'이 있고, '이번 턴에 안 쓴' 기술만 필터링
  const availableTechs = player.technologies.filter(
    tech => tech.resourceAbility && !tech.abilityUsedThisTurn
  );

  return (
    <div className="relative flex flex-col items-end z-30">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full mb-4 right-0 bg-slate-800 border-2 border-emerald-500/50 rounded-xl p-4 w-80 shadow-2xl flex flex-col gap-3 origin-bottom-right"
          >
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
              <h4 className="text-emerald-300 font-bold">사용 가능한 기술 능력</h4>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            {/* 사용 가능한 능력이 없을 때 */}
            {availableTechs.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-6">
                현재 사용 가능한 기술 능력이 없습니다.
              </div>
            )}

            {/* 사용 가능한 능력 리스트 */}
            {availableTechs.map(tech => (
              <button 
                key={tech.id}
                onClick={() => {
                  // 현재 '도시 경영' 단계에서만 쓰게 제한 (기획에 맞게 수정 가능)
                  if (currentPhase !== 'cityManagement') {
                      alert("이 능력은 도시 경영 단계에서만 사용할 수 있습니다.");
                      return;
                  }
                  
                  // 일부 스킬(도자기 등)은 payload(타겟이나 추가 자원)가 필요하므로
                  // 추후 팝업 연동을 위해 임시로 비워두거나 바로 호출합니다.
                  useTechResourceAbility(tech.id, {});
                  setIsOpen(false);
                }}
                className="p-3 bg-slate-700 hover:bg-emerald-900/40 border border-slate-600 hover:border-emerald-500 rounded text-left transition-all group flex flex-col justify-between"
              >
                <div className="text-white font-bold mb-1 flex justify-between items-center">
                  <span>{tech.name}</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Lv.{tech.level}
                  </span>
                </div>
                <div className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                  {tech.resourceAbility?.description}
                </div>
                
                {/* 화폐 토큰 제한이 있는 기술(도자기, 법계 등) 표시 */}
                {tech.resourceAbility?.maxTokens && (
                  <div className="mt-2 text-[10px] font-bold text-amber-400 text-right">
                    🪙 누적 화폐: {tech.tokensOnCard} / {tech.resourceAbility.maxTokens}
                  </div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-900/50 transition-transform hover:scale-105 flex items-center gap-2 border border-emerald-400/30 whitespace-nowrap"
      >
        <span className="text-xl">💡</span>
        <span>기술 능력 ({availableTechs.length})</span>
      </button>
    </div>
  );
}