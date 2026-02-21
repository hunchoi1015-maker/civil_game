import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Technology } from '../../types/tech';

export function TechAbilityWidget() {
  const { 
    players, 
    currentPlayerIndex, 
    useTechResourceAbility, 
    currentPhase,
    startTargeting,
    startResourceSelection,
    targetingMode,     
    cancelTargeting     

  } = useGameStore();
  
  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);

  const availableTechs = player.technologies.filter(
    tech => tech.resourceAbility && !tech.abilityUsedThisTurn
  );

  // 🌟 스킬 버튼을 눌렀을 때의 분기 처리 함수
  const handleAbilityUse = (tech: Technology) => {
    if (currentPhase !== 'cityManagement') {
        alert("이 능력은 도시 경영 단계에서만 사용할 수 있습니다.");
        return;
    }

    // 도시를 눌러야만 사용 가능한 기술
    if (['animal_husbandry', 'construction', 'finance'].includes(tech.id)) {
      startTargeting(tech.id, 'my_city'); 
      setIsOpen(false);
      return; 
    }

    // 타일을 눌러야 사용 가능한 기술
    if (tech.id === 'communism') {
      startTargeting(tech.id, 'tile');
      setIsOpen(false);
      return; 
    }

    //  도자기 (자원 2개 요구)
    if (tech.id === 'pottery') {
      startResourceSelection(tech.id, 2);
      setIsOpen(false);
      return;
    }

    //  철학 (자원 3개 요구)
    if (tech.id === 'philosophy') {
      startResourceSelection(tech.id, 3);
      setIsOpen(false);
      return;
    }
    // 일반 기술은 즉시 발동
    useTechResourceAbility(tech.id, {});
    setIsOpen(false);
  };

  const renderCitySelectionModal = () => {
    if (!targetingMode?.isActive || targetingMode.targetType !== 'my_city') return null;
    
    let bonusText = '';
    if (targetingMode.techId === 'animal_husbandry') bonusText = '생산력 +3';
    else if (targetingMode.techId === 'construction') bonusText = '생산력 +5';
    else if (targetingMode.techId === 'finance') bonusText = '생산력 +7';

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
        <div className="bg-slate-800 p-6 rounded-lg border-2 border-emerald-500 w-96 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">🏛️ 대상 도시 선택</h3>
          <p className="text-sm text-slate-300 mb-4">이번 턴에 {bonusText} 효과를 받을 내 도시를 선택하세요.</p>
          
          {/* 도시 리스트 렌더링 */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {player.cities.map(city => (
              <button 
                key={city.id}
                onClick={() => {
                  useTechResourceAbility(targetingMode.techId!, { targetCityId: city.id });
                  cancelTargeting(); // 선택 완료 시 창 닫기
                }}
                className="w-full p-3 bg-slate-700 hover:bg-emerald-900/50 rounded text-left text-white font-bold transition-colors flex justify-between items-center border border-slate-600 hover:border-emerald-500"
              >
                <span>{city.name}</span>
                <span className="text-xs text-amber-400">{bonusText}</span>
              </button>
            ))}
            {/* 도시가 없을 때의 예외 처리 */}
            {player.cities.length === 0 && <p className="text-slate-500 py-2 text-center">도시가 없습니다.</p>}
          </div>
          
          <button onClick={cancelTargeting} className="mt-4 w-full p-3 bg-slate-600 hover:bg-slate-500 text-white rounded font-bold transition-colors">
            취소
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-end z-30">
      {renderCitySelectionModal()}
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
            
            {availableTechs.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-6">
                현재 사용 가능한 기술 능력이 없습니다.
              </div>
            )}

            {availableTechs.map(tech => (
              <button 
                key={tech.id}
                onClick={() => handleAbilityUse(tech)} // 🌟 방금 만든 함수로 교체!
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