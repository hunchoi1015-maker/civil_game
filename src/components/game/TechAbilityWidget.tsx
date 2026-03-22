// src/components/game/TechAbilityWidget.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Technology } from '../../types/tech';
import { WONDERS, WonderType } from '../../types/wonder';

export function TechAbilityWidget() {
  const { 
    players, 
    currentPlayerIndex, 
    useTechResourceAbility, 
    currentPhase,
    startTargeting,
    startResourceSelection,
    targetingMode,     
    cancelTargeting,
    setSteamPowerSource,
    addToast     
  } = useGameStore();
  
  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);
  
  const [customModalMode, setCustomModalMode] = useState<{ type: string, techId: string, extra?: any } | null>(null);
  const [gunpowderSelections, setGunpowderSelections] = useState<Record<string, number>>({});

  const availableTechs = player.technologies.filter(tech => {
    if (!tech.resourceAbility) return false;
    if (tech.id === 'atomic_theory') return !(tech.usedPhases?.includes(currentPhase));
    return !tech.abilityUsedThisTurn;
  });

  const getRequiredPhase = (techId: string): string | string[] => {
    if (techId === 'atomic_theory') return ['cityManagement', 'movement']; 
    if (['horseback_riding'].includes(techId)) return 'trade';
    if (['communism', 'steam_power', 'biology', 'mathematics', 'ballistics', 'metal_casting'].includes(techId)) return 'movement';
    return 'cityManagement'; 
  };
  
  const handleAbilityUse = (tech: Technology) => {
    const reqPhase = getRequiredPhase(tech.id);
    const isAllowed = Array.isArray(reqPhase) ? reqPhase.includes(currentPhase) : currentPhase === reqPhase;

    if (!isAllowed) {
        const phaseNames: Record<string, string> = { trade: '교역', cityManagement: '도시 경영', movement: '이동' };
        const allowedNames = Array.isArray(reqPhase) ? reqPhase.map(p => phaseNames[p]).join(' 또는 ') : phaseNames[reqPhase as string];
        addToast(`이 능력은 ${allowedNames} 단계에서만 사용할 수 있습니다.`, 'warning');
        return;
    }

    if (tech.id === 'atomic_theory') {
      if (currentPhase === 'cityManagement') {
        const hasUnactedCity = player.cities.some(city => !city.hasActedThisTurn);
        if (hasUnactedCity) {
          const confirmUse = window.confirm("아직 행동하지 않은 도시가 있습니다. 그래도 원자론(핵발전소) 스킬을 사용하여 모든 행동을 리셋하시겠습니까?");
          if (!confirmUse) return; 
        }
        useTechResourceAbility('atomic_theory', {});
      } else if (currentPhase === 'movement') {
        startTargeting(tech.id, 'tile');
        addToast("지도에서 핵 공격을 감행할 타일(도시)을 클릭하세요.");
      }
      setIsOpen(false);
      return;
    }

    if (tech.id === 'horseback_riding') { setCustomModalMode({ type: 'player', techId: tech.id }); setIsOpen(false); return; }
    if (tech.id === 'writing') { setCustomModalMode({ type: 'enemy_city', techId: tech.id }); setIsOpen(false); return; }
    if (tech.id === 'metal_casting') { setCustomModalMode({ type: 'my_army_card', techId: tech.id }); setIsOpen(false); return; }
    if (['animal_husbandry', 'construction', 'finance'].includes(tech.id)) { startTargeting(tech.id, 'my_city'); setIsOpen(false); return; }
    if (tech.id === 'communism') { startTargeting(tech.id, 'tile'); setIsOpen(false); return; }
    if (tech.id === 'pottery') { startResourceSelection(tech.id, 2); setIsOpen(false); return; }
    if (tech.id === 'philosophy') { startResourceSelection(tech.id, 3); setIsOpen(false); return; }
    if (tech.id === 'monarchy') { setCustomModalMode({ type: 'monarchy_target', techId: tech.id }); setIsOpen(false); return; }
    if (tech.id === 'gunpowder') { setCustomModalMode({ type: 'gunpowder_target', techId: tech.id }); setIsOpen(false); return; }
    if (tech.id === 'steam_power') { setCustomModalMode({ type: 'steam_power_source', techId: tech.id }); setIsOpen(false); return; }

    useTechResourceAbility(tech.id, {});
    setIsOpen(false);
  };

  const renderCustomModal = () => {
      if (!customModalMode) return null;

      const getPlayerWonders = (p: any) => {
          let owned: string[] = [];
          if (p.wonders) owned.push(...p.wonders);
          if (p.builtWonders) owned.push(...p.builtWonders);
          p.cities?.forEach((c: any) => {
              if (c.wonders) owned.push(...c.wonders);
              c.buildings?.forEach((b: any) => { if (WONDERS[b.type as WonderType]) owned.push(b.type); });
          });
          return Array.from(new Set(owned));
      };

      const enemyPlayers = players.filter(p => p.id !== player.id && !p.isEliminated);

      const CustomModalWrapper = ({ children, title }: { children: React.ReactNode, title: string }) => (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] backdrop-blur-sm">
              <div className="panel-texture p-7 rounded-2xl w-[450px] flex flex-col shadow-2xl max-h-[80vh] border-amber-500/50 font-serif">
                  <div className="panel-content flex flex-col h-full">
                      <h3 className="text-2xl font-black text-amber-400 text-glow-gold mb-4 border-b border-amber-700/30 pb-3">{title}</h3>
                      {children}
                  </div>
              </div>
          </div>
      );

      if (customModalMode.type === 'monarchy_target') {
          return (
              <CustomModalWrapper title="👑 군주제 (비단 1 소모)">
                  <p className="text-sm text-amber-100/70 mb-4">효과를 적용할 대상을 선택하세요.</p>
                  <div className="space-y-5 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      <div>
                          <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2"><span>🗡️</span> 부대 카드 무작위 파괴</h4>
                          {enemyPlayers.map(p => (
                              <button key={`card_${p.id}`} onClick={() => {
                                  useTechResourceAbility('monarchy', { targetType: 'random_card', targetPlayerId: p.id });
                                  setCustomModalMode(null);
                              }} className="w-full p-3 bg-slate-800 hover:bg-rose-950/60 rounded-lg text-left text-amber-50 transition-colors border border-amber-700/30 hover:border-red-500 shadow-sm mb-2">
                                  <span className="font-bold">{p.name}</span>의 부대 1장 파괴 <span className="text-xs text-slate-400 ml-2">(남은 카드: <span className="font-cinzel">{p.armyCards.length}</span>장)</span>
                              </button>
                          ))}
                      </div>
                      <div>
                          <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2"><span>🏛️</span> 고대 불가사의 무효화</h4>
                          {enemyPlayers.flatMap(p => getPlayerWonders(p).map(w => ({ p, w, data: WONDERS[w as WonderType] })))
                            .filter(item => item.data?.era === 'ancient' && !item.p.invalidatedWonders?.includes(item.w))
                            .map((item, idx) => (
                              <button key={`wonder_${idx}`} onClick={() => {
                                  useTechResourceAbility('monarchy', { targetType: 'wonder', targetPlayerId: item.p.id, targetWonder: item.w });
                                  setCustomModalMode(null);
                              }} className="w-full p-3 bg-slate-800 hover:bg-rose-950/60 rounded-lg text-left text-amber-50 transition-colors border border-amber-700/30 hover:border-red-500 shadow-sm mb-2">
                                  <span className="font-bold">{item.p.name}</span>의 [{item.data.name}] 무효화
                              </button>
                          ))}
                      </div>
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">명령 취소</button>
              </CustomModalWrapper>
          );
      }

      if (customModalMode.type === 'gunpowder_target') {
          const bTargets: { owner: any, city: any, type: string, name: string }[] = [];
          const wTargets: { owner: any, wonderId: string, name: string }[] = [];
          enemyPlayers.forEach(p => {
              p.cities.forEach(c => { c.buildings.forEach(b => { if (!WONDERS[b.type as WonderType]) bTargets.push({ owner: p, city: c, type: b.type, name: `${c.name}의 ${b.type}` }); }); });
              getPlayerWonders(p).forEach(w => { const wData = WONDERS[w as WonderType]; if ((wData?.era === 'ancient' || wData?.era === 'medieval') && !p.invalidatedWonders?.includes(w)) wTargets.push({ owner: p, wonderId: w, name: wData.name }); });
          });

          return (
              <CustomModalWrapper title="🧨 화약: 공작 대상 선택">
                  <p className="text-sm text-amber-100/70 mb-4">파괴할 건물이나 무효화할 불가사의(고대/중세)를 선택하세요.</p>
                  <div className="space-y-5 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      <div>
                          <h4 className="text-amber-500 font-bold mb-2">🔥 일반 건물 파괴</h4>
                          {bTargets.map((t, idx) => (
                              <button key={`b_${idx}`} onClick={() => { setCustomModalMode({ type: 'gunpowder_resource', techId: 'gunpowder', extra: { targetType: 'building', targetPlayerId: t.owner.id, targetCityId: t.city.id, targetBuilding: t.type }}); }} className="w-full p-3 bg-slate-800 hover:bg-rose-950/60 rounded-lg text-left text-amber-50 transition-colors border border-amber-700/30 hover:border-red-500 shadow-sm mb-2">
                                  [{t.owner.name}] {t.name}
                              </button>
                          ))}
                          {bTargets.length === 0 && <p className="text-amber-200/40 text-xs italic">상대의 건물이 없습니다.</p>}
                      </div>
                      <div>
                          <h4 className="text-amber-500 font-bold mb-2">🏛️ 불가사의 무효화</h4>
                          {wTargets.map((t, idx) => (
                              <button key={`w_${idx}`} onClick={() => { setCustomModalMode({ type: 'gunpowder_resource', techId: 'gunpowder', extra: { targetType: 'wonder', targetPlayerId: t.owner.id, targetWonder: t.wonderId }}); }} className="w-full p-3 bg-slate-800 hover:bg-rose-950/60 rounded-lg text-left text-amber-50 transition-colors border border-amber-700/30 hover:border-red-500 shadow-sm mb-2">
                                  [{t.owner.name}] {t.name} 무효화
                              </button>
                          ))}
                          {wTargets.length === 0 && <p className="text-amber-200/40 text-xs italic">상대의 활성화된 고대/중세 불가사의가 없습니다.</p>}
                      </div>
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">취소</button>
              </CustomModalWrapper>
          );
      }

      if (customModalMode.type === 'gunpowder_resource') {
          const totalSelected = Object.values(gunpowderSelections).reduce((a, b) => a + b, 0);
          return (
            <CustomModalWrapper title="🧨 화약 자원 소모">
              <p className="text-sm text-amber-100/70 mb-4">파괴 공작을 위해 자원 2개를 지불하세요. (스파이/우라늄 포함)</p>
              <div className="bg-slate-950/80 p-4 rounded-lg border border-amber-900/50 mb-4 shadow-inner text-center">
                  <span className="text-amber-500 font-bold">지불할 자원: </span>
                  <span className="font-cinzel text-3xl font-black text-amber-400 text-glow-gold mx-2">{totalSelected}</span> 
                  <span className="text-amber-200/50 font-cinzel">/ 2</span>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {Object.entries({ ...player.luxuryResources, spies: player.spies, nuclearMaterial: player.nuclearMaterial }).map(([res, count]) => {
                      if (count <= 0) return null;
                      const selected = gunpowderSelections[res] || 0;
                      return (
                          <div key={res} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg border border-amber-700/30">
                              <span className="text-amber-50 font-bold">{res} <span className="text-xs text-amber-200/50 ml-1">(보유: <span className="font-cinzel">{count}</span>)</span></span>
                              <div className="flex items-center gap-3">
                                  <button onClick={() => setGunpowderSelections(p => ({ ...p, [res]: Math.max(0, selected - 1) }))} className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold disabled:opacity-30 border border-slate-500" disabled={selected === 0}>-</button>
                                  <span className="w-6 text-center font-cinzel font-bold text-xl text-amber-400">{selected}</span>
                                  <button onClick={() => setGunpowderSelections(p => ({ ...p, [res]: selected + 1 }))} disabled={totalSelected >= 2 || selected >= count} className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold disabled:opacity-30 border border-slate-500">+</button>
                              </div>
                          </div>
                      );
                  })}
              </div>
              <div className="flex gap-3 mt-5 border-t border-amber-700/30 pt-4">
                  <button onClick={() => { setCustomModalMode(null); setGunpowderSelections({}); }} className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold">취소</button>
                  <button onClick={() => { useTechResourceAbility('gunpowder', { ...customModalMode.extra, consumedResources: gunpowderSelections }); setCustomModalMode(null); setGunpowderSelections({}); }} disabled={totalSelected < 2} className="flex-1 p-3 bg-amber-700 hover:bg-amber-600 border border-amber-500 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold shadow-glow-gold">파괴 실행</button>
              </div>
            </CustomModalWrapper>
          );
      }

      if (customModalMode.type === 'steam_power_source') {
          const tilesWithUnits = Array.from(new Set(player.units.map(u => `${u.position.x},${u.position.y}`))).map(str => {
              const [x, y] = str.split(',').map(Number);
              return { x, y, count: player.units.filter(u => u.position.x === x && u.position.y === y).length };
          });

          return (
              <CustomModalWrapper title="🚂 증기력: 출발지 선택">
                  <p className="text-sm text-amber-100/70 mb-4">순간이동시킬 유닛이 있는 타일을 선택하세요. (비단 1 소모)</p>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      {tilesWithUnits.map(t => (
                          <button
                              key={`${t.x},${t.y}`}
                              onClick={() => {
                                  setSteamPowerSource({ x: t.x, y: t.y });
                                  startTargeting(customModalMode.techId, 'tile');
                                  setCustomModalMode(null);
                                  addToast("지도에서 도착할 '물 타일'을 클릭하세요.");
                              }}
                              className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-amber-50 font-bold transition-all flex justify-between items-center border border-amber-700/30 hover:border-amber-400 shadow-sm"
                          >
                              <span>좌표 <span className="font-cinzel text-amber-400">({t.x}, {t.y})</span></span>
                              <span className="text-sm text-slate-400 font-sans">유닛 <span className="font-cinzel text-amber-200">{t.count}</span>기</span>
                          </button>
                      ))}
                      {tilesWithUnits.length === 0 && <p className="text-amber-200/40 text-xs italic text-center py-4">배치된 유닛이 없습니다.</p>}
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">취소</button>
              </CustomModalWrapper>
          );
      }
      
      if (customModalMode.type === 'player') {
          return (
              <CustomModalWrapper title="👥 대상 플레이어 선택">
                  <p className="text-sm text-amber-100/70 mb-4">효과를 받을 상대를 선택하세요.</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {players.filter(p => p.id !== player.id && !p.isEliminated).map(p => (
                          <button
                              key={p.id}
                              onClick={() => {
                                  useTechResourceAbility(customModalMode.techId, { targetPlayerId: p.id });
                                  setCustomModalMode(null);
                              }}
                              className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-left text-amber-50 font-bold transition-all border border-amber-700/30 hover:border-amber-400 shadow-sm"
                          >
                              {p.name}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">취소</button>
              </CustomModalWrapper>
          );
      }

      if (customModalMode.type === 'enemy_city') {
          const enemyCities = players.filter(p => p.id !== player.id && !p.isEliminated).flatMap(p => 
              p.cities.map(c => ({ city: c, player: p }))
          );

          return (
              <CustomModalWrapper title="🎯 적 도시 마비">
                  <p className="text-sm text-amber-100/70 mb-4">다음 턴 행동을 봉쇄할 적 도시를 선택하세요.</p>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      {enemyCities.map(({ city, player: owner }) => (
                          <button
                              key={city.id}
                              onClick={() => {
                                  useTechResourceAbility(customModalMode.techId, { targetPlayerId: owner.id, targetCityId: city.id });
                                  setCustomModalMode(null);
                              }}
                              className="w-full p-4 bg-slate-800 hover:bg-rose-950/60 rounded-lg text-left text-amber-50 font-bold transition-all border border-amber-700/30 hover:border-red-500 shadow-sm flex justify-between items-center"
                          >
                              <span>{city.name}</span>
                              <span className="text-xs text-slate-400 font-sans">({owner.name})</span>
                          </button>
                      ))}
                      {enemyCities.length === 0 && <p className="text-amber-200/40 text-xs italic text-center py-4">마비시킬 적 도시가 없습니다.</p>}
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">취소</button>
              </CustomModalWrapper>
          );
      }

      if (customModalMode.type === 'my_army_card') {
          return (
              <CustomModalWrapper title="⚔️ 부대 카드 강화">
                  <p className="text-sm text-amber-100/70 mb-4">강화할 내 부대 카드를 선택하세요. (공격력 +3)</p>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      {player.armyCards.map(card => (
                          <button
                              key={card.id}
                              onClick={() => {
                                  useTechResourceAbility(customModalMode.techId, { targetCardId: card.id });
                                  setCustomModalMode(null);
                              }}
                              className="w-full p-4 bg-slate-800 hover:bg-emerald-950/60 rounded-lg text-left text-amber-50 font-bold transition-all border border-amber-700/30 hover:border-emerald-500 shadow-sm flex justify-between items-center"
                          >
                              <span>{card.name}</span>
                              <span className="text-sm font-sans text-slate-400">공<span className="font-cinzel text-red-300">{card.attack}</span> / 체<span className="font-cinzel text-green-300">{card.health}</span></span>
                          </button>
                      ))}
                      {player.armyCards.length === 0 && <p className="text-amber-200/40 text-xs italic text-center py-4">보유한 부대 카드가 없습니다.</p>}
                  </div>
                  <button onClick={() => setCustomModalMode(null)} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold shadow-sm">취소</button>
              </CustomModalWrapper>
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm">
        <div className="panel-texture p-7 rounded-2xl w-[400px] shadow-2xl border-amber-500/50 font-serif">
          <div className="panel-content">
            <h3 className="text-2xl font-black text-amber-400 text-glow-gold mb-3 border-b border-amber-700/30 pb-2">🏛️ 축복 대상 도시 선택</h3>
            <p className="text-sm text-amber-100/70 mb-5">이번 턴에 <span className="text-amber-400 font-bold">{bonusText}</span> 혜택을 받을 내 도시를 선택하세요.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {player.cities.map(city => (
                <button 
                  key={city.id}
                  onClick={() => {
                    useTechResourceAbility(targetingMode.techId!, { targetCityId: city.id });
                    cancelTargeting();
                  }}
                  className="w-full p-4 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-left text-amber-50 font-bold transition-all flex justify-between items-center border border-amber-700/30 hover:border-amber-400 shadow-sm"
                >
                  <span className="text-lg">{city.name}</span>
                  <span className="text-sm text-amber-400">{bonusText}</span>
                </button>
              ))}
              {player.cities.length === 0 && <p className="text-amber-200/40 text-xs italic py-2 text-center">도시가 없습니다.</p>}
            </div>
            
            <button onClick={cancelTargeting} className="mt-5 w-full p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg font-bold transition-colors">
              명령 취소
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-end z-30 font-serif">
      {renderCitySelectionModal()}
      {renderCustomModal()}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-full mb-4 right-0 panel-texture border-amber-500/50 rounded-xl p-5 w-80 shadow-2xl flex flex-col gap-3 origin-bottom-right"
          >
            <div className="panel-content">
              <div className="flex justify-between items-center border-b border-amber-700/30 pb-2 mb-3">
                <h4 className="text-lg font-black text-amber-400 text-glow-gold">💡 사용 가능한 기술 능력</h4>
                <button onClick={() => setIsOpen(false)} className="text-amber-500/50 hover:text-amber-400 text-xl">✕</button>
              </div>
              
              {availableTechs.length === 0 && (
                <div className="text-sm text-amber-200/50 text-center py-6 italic">
                  현재 사용 가능한 기술 능력이 없습니다.
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {availableTechs.map(tech => (
                  <button 
                    key={tech.id}
                    onClick={() => handleAbilityUse(tech)}
                    className="w-full p-3.5 bg-slate-800/80 hover:bg-amber-900/30 border border-amber-700/30 hover:border-amber-400 rounded-lg text-left transition-all group flex flex-col justify-between shadow-sm"
                  >
                    <div className="text-amber-100 font-bold mb-2 flex justify-between items-center">
                      <span className="drop-shadow-sm">{tech.name}</span>
                      <span className="text-[10px] font-cinzel bg-slate-950/80 border border-amber-500/50 text-amber-300 px-1 py-0.5 rounded-full shadow-inner">
                        Lv.{tech.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-200/60 group-hover:text-amber-100 leading-relaxed font-sans">
                      {tech.resourceAbility?.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-slate-900 to-slate-800 text-amber-100 px-2 py-1 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2 border-2 border-amber-600/50 hover:border-amber-400 whitespace-nowrap shadow-glow-gold"
      >
        <span className="text-2xl drop-shadow-md">💡</span>
        <span>스킬 토큰 (<span className="font-cinzel text-amber-400">{availableTechs.length}</span>)</span>
      </button>
    </div>
  );
}