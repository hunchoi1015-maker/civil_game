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
  
  // 🌟 [신규] 상대를 지정하는 등 특수한 모달을 띄우기 위한 상태
  const [customModalMode, setCustomModalMode] = useState<{ type: string, techId: string } | null>(null);

  const availableTechs = player.technologies.filter(
    tech => tech.resourceAbility && !tech.abilityUsedThisTurn
  );

  // 기술별 허용되는 페이즈 구분
  const getRequiredPhase = (techId: string) => {
    if (['horseback_riding'].includes(techId)) return 'trade';
    // 🌟 금속가공(metal_casting)을 movement(이동/전투) 단계에 추가!
    if (['communism', 'steam_power', 'biology', 'mathematics', 'ballistics', 'metal_casting'].includes(techId)) return 'movement';
    return 'cityManagement'; 
  };
  
  const handleAbilityUse = (tech: Technology) => {
    const reqPhase = getRequiredPhase(tech.id);
    if (currentPhase !== reqPhase) {
        const phaseNames: Record<string, string> = {
            trade: '교역',
            cityManagement: '도시 경영',
            movement: '이동'
        };
        alert(`이 능력은 ${phaseNames[reqPhase]} 단계에서만 사용할 수 있습니다.`);
        return;
    }

    // 🌟 1. 커스텀 모달 타겟팅
    if (tech.id === 'horseback_riding') {
        setCustomModalMode({ type: 'player', techId: tech.id });
        setIsOpen(false);
        return;
    }
    if (tech.id === 'writing') {
        setCustomModalMode({ type: 'enemy_city', techId: tech.id });
        setIsOpen(false);
        return;
    }
    if (tech.id === 'metal_casting') {
        setCustomModalMode({ type: 'my_army_card', techId: tech.id });
        setIsOpen(false);
        return;
    }
    // 🌟 2. 맵 타일 타겟팅 (내 도시)
    if (['animal_husbandry', 'construction', 'finance'].includes(tech.id)) {
      startTargeting(tech.id, 'my_city'); 
      setIsOpen(false);
      return; 
    }

    // 🌟 3. 맵 타일 타겟팅 (임의의 칸)
    if (tech.id === 'communism') {
      startTargeting(tech.id, 'tile');
      setIsOpen(false);
      return; 
    }

    // 🌟 4. 자원 소모 타겟팅
    if (tech.id === 'pottery') {
      startResourceSelection(tech.id, 2);
      setIsOpen(false);
      return;
    }
    if (tech.id === 'philosophy') {
      startResourceSelection(tech.id, 3);
      setIsOpen(false);
      return;
    }

    // 🌟 5. 일반 기술 (페이로드 없이 즉시 발동: 금속가공, 원자론 등)
    useTechResourceAbility(tech.id, {});
    setIsOpen(false);
  };

  const renderCustomModal = () => {
      if (!customModalMode) return null;

      // 승마 기술 등: 다른 플레이어 지목
      if (customModalMode.type === 'player') {
          return (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
                  <div className="bg-slate-800 p-6 rounded-lg border-2 border-emerald-500 w-96 shadow-2xl">
                      <h3 className="text-xl font-bold text-white mb-4">👥 대상 플레이어 선택</h3>
                      <p className="text-sm text-slate-300 mb-4">효과를 받을 상대를 선택하세요.</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                          {players.filter(p => p.id !== player.id && !p.isEliminated).map(p => (
                              <button
                                  key={p.id}
                                  onClick={() => {
                                      useTechResourceAbility(customModalMode.techId, { targetPlayerId: p.id });
                                      setCustomModalMode(null);
                                  }}
                                  className="w-full p-3 bg-slate-700 hover:bg-emerald-900/50 rounded text-left text-white font-bold transition-colors"
                              >
                                  {p.name}
                              </button>
                          ))}
                      </div>
                      <button onClick={() => setCustomModalMode(null)} className="mt-4 w-full p-3 bg-slate-600 hover:bg-slate-500 text-white rounded font-bold">취소</button>
                  </div>
              </div>
          );
      }

      // 기록 기술: 적 도시 지목
      if (customModalMode.type === 'enemy_city') {
          const enemyCities = players.filter(p => p.id !== player.id && !p.isEliminated).flatMap(p => 
              p.cities.map(c => ({ city: c, player: p }))
          );

          return (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
                  <div className="bg-slate-800 p-6 rounded-lg border-2 border-emerald-500 w-96 flex flex-col shadow-2xl max-h-[80vh]">
                      <h3 className="text-xl font-bold text-white mb-4">🎯 적 도시 마비</h3>
                      <p className="text-sm text-slate-300 mb-4">다음 턴 행동을 봉쇄할 적 도시를 선택하세요.</p>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                          {enemyCities.map(({ city, player: owner }) => (
                              <button
                                  key={city.id}
                                  onClick={() => {
                                      useTechResourceAbility(customModalMode.techId, { targetPlayerId: owner.id, targetCityId: city.id });
                                      setCustomModalMode(null);
                                  }}
                                  className="w-full p-3 bg-slate-700 hover:bg-red-900/50 rounded text-left text-white font-bold transition-colors border border-slate-600"
                              >
                                  <div className="flex justify-between items-center">
                                      <span>{city.name}</span>
                                      <span className="text-xs text-slate-400">{owner.name}</span>
                                  </div>
                              </button>
                          ))}
                          {enemyCities.length === 0 && <p className="text-slate-500 text-center py-4">마비시킬 적 도시가 없습니다.</p>}
                      </div>
                      <button onClick={() => setCustomModalMode(null)} className="mt-4 w-full p-3 bg-slate-600 hover:bg-slate-500 text-white rounded font-bold">취소</button>
                  </div>
              </div>
          );
      }
      // 부대 카드 선택 랜더링 
      if (customModalMode.type === 'my_army_card') {
          return (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]">
                  <div className="bg-slate-800 p-6 rounded-lg border-2 border-emerald-500 w-96 flex flex-col shadow-2xl max-h-[80vh]">
                      <h3 className="text-xl font-bold text-white mb-4">⚔️ 부대 카드 강화</h3>
                      <p className="text-sm text-slate-300 mb-4">강화할 내 부대 카드를 선택하세요. (공격력 +3)</p>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                          {player.armyCards.map(card => (
                              <button
                                  key={card.id}
                                  onClick={() => {
                                      useTechResourceAbility(customModalMode.techId, { targetCardId: card.id });
                                      setCustomModalMode(null);
                                  }}
                                  className="w-full p-3 bg-slate-700 hover:bg-emerald-900/50 rounded text-left text-white transition-colors border border-slate-600 flex justify-between items-center"
                              >
                                  <span className="font-bold">{card.name}</span>
                                  <span className="text-sm text-slate-400">공{card.attack} / 체{card.health}</span>
                              </button>
                          ))}
                          {player.armyCards.length === 0 && <p className="text-slate-500 text-center py-4">보유한 부대 카드가 없습니다.</p>}
                      </div>
                      <button onClick={() => setCustomModalMode(null)} className="mt-4 w-full p-3 bg-slate-600 hover:bg-slate-500 text-white rounded font-bold">취소</button>
                  </div>
              </div>
          );
      }

      return null;
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
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {player.cities.map(city => (
              <button 
                key={city.id}
                onClick={() => {
                  useTechResourceAbility(targetingMode.techId!, { targetCityId: city.id });
                  cancelTargeting();
                }}
                className="w-full p-3 bg-slate-700 hover:bg-emerald-900/50 rounded text-left text-white font-bold transition-colors flex justify-between items-center border border-slate-600 hover:border-emerald-500"
              >
                <span>{city.name}</span>
                <span className="text-xs text-amber-400">{bonusText}</span>
              </button>
            ))}
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
      {renderCustomModal()}
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
                onClick={() => handleAbilityUse(tech)}
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