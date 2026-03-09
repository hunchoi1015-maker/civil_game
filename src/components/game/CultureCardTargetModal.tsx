// src/components/game/CultureCardTargetModal.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getEffectiveTechLevel, canLearnTechInPyramid } from '../../store/helpers/validationHelpers';

export const CultureCardTargetModal: React.FC = () => {
  const { players, currentPlayerIndex, activeCardTargeting, cancelCardTargeting, playCultureCard } = useGameStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [ideaShareStep, setIdeaShareStep] = useState<number>(0);
  const [opponentSelectedTechId, setOpponentSelectedTechId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlayerId(null);
    setSelectedResource(null);
    setSelectedTechId(null);
    setSelectedUnitIds([]);
    setSelectedCityId(null);
    setIdeaShareStep(0);
    setOpponentSelectedTechId(null);
  }, [activeCardTargeting?.cardId]);

  if (!activeCardTargeting) return null;

  const templateId = activeCardTargeting.templateId;

  // =======================================================================
  // 🌟 1. 맵 타겟팅(플로팅 UI) 전용 렌더링 
  // (배경을 막지 않고 클릭이 맵으로 통과되도록 pointer-events-none 사용)
  // =======================================================================
  const isFloatingUI = ['exile', 'disappearance', 'command_collapse', 'mass_asylum', 'cataclysm'].includes(templateId);

  if (isFloatingUI) {
    let message = "";
    if (templateId === 'exile') message = activeCardTargeting.step === 0 ? "🎯 망명: 밀어낼 적 유닛 클릭" : "🗺️ 망명: 이동시킬 빈 타일 클릭 (2칸)";
    else if (templateId === 'disappearance') message = activeCardTargeting.step === 0 ? "👻 실종: 치워버릴 적 무리 클릭" : "🗺️ 실종: 이동시킬 빈 타일 클릭 (3칸 이내)";
    else if (templateId === 'command_collapse') message = activeCardTargeting.step === 0 ? "📡 지휘권 붕괴: 밀어낼 적 무리 클릭" : "🗺️ 지휘권 붕괴: 이동시킬 빈 타일 클릭 (4칸 이내)";

    return (
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 pointer-events-none">
        
        {/* 이동형 카드 플로팅 배너 */}
        {['exile', 'disappearance', 'command_collapse'].includes(templateId) && (
          <div className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold shadow-xl animate-pulse flex items-center gap-4 pointer-events-auto">
            <span>{message}</span>
            <button onClick={cancelCardTargeting} className="bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-sm">취소</button>
          </div>
        )}

        {/* 3단계 파괴형 멀티 타겟팅 배너 */}
        {['mass_asylum', 'cataclysm'].includes(templateId) && (
          <div className="bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-4 animate-pulse pointer-events-auto">
            <span>
              {templateId === 'mass_asylum' ? "🌪️ 대규모 망명: 제거할 적 유닛/위인 타일 클릭" : "🌋 대재앙: 파괴할 상대 건물 타일 클릭"}
            </span>
            <span className="bg-black/40 px-3 py-1 rounded-full text-sm border border-white/30">
              선택됨: {activeCardTargeting.data?.targets?.length || 0} / 2
            </span>
            {(activeCardTargeting.data?.targets?.length || 0) > 0 && (
               <button
                 onClick={() => {
                   playCultureCard(activeCardTargeting.cardId, { targets: activeCardTargeting.data.targets });
                   cancelCardTargeting();
                 }}
                 className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-1 rounded-full text-sm transition-colors shadow-lg"
               >
                 현재 {activeCardTargeting.data.targets.length}개로 파괴 완료
               </button>
            )}
            <button onClick={cancelCardTargeting} className="bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-sm">취소</button>
          </div>
        )}
      </div>
    );
  }

  // =======================================================================
  // 🌟 2. 일반 모달 UI 전용 렌더링 (배경 어둡게)
  // =======================================================================
  const isCivilUprising = templateId === 'civil_uprising';
  const isGift = templateId.startsWith('gift_from_afar');
  const isBountifulGift = templateId === 'bountiful_gift' || templateId === 'noble_gift'; 
  const isIdeaShare = templateId === 'idea_share' || templateId === 'knowledge_sharing' || templateId === 'think_tank'; 
  const isMassExile = templateId === 'mass_exile';
  const isCityBoost = templateId === 'queens_day' || templateId === 'dictators_day' || templateId === 'presidents_day';

  if (!isCivilUprising && !isGift && !isBountifulGift && !isIdeaShare && !isMassExile && !isCityBoost) return null;

  const currentPlayer = players[currentPlayerIndex];
  const otherPlayers = players.filter(p => p.id !== currentPlayer.id);

  const handleConfirm = () => {
    if (isCivilUprising) {
      if (!selectedPlayerId) return alert("대상을 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId });
      cancelCardTargeting();
    } else if (isGift || isBountifulGift) {
      if (isGift && !selectedPlayerId) return alert("대상을 선택해주세요.");
      if (!selectedResource) return alert("자원을 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId, resourceType: selectedResource });
      cancelCardTargeting();
    } 
    else if (isMassExile) {
      if (selectedUnitIds.length === 0) return alert("제거할 대상을 1~2개 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetUnitIds: selectedUnitIds });
      cancelCardTargeting();
    } else if (isCityBoost) {
      if (!selectedCityId) return alert("도시를 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { cityId: selectedCityId });
      cancelCardTargeting();
    }
  };

  const handlePlayerSelect = (pId: string) => {
    setSelectedPlayerId(pId);
    setSelectedTechId(null);
  };

  let resourceOptions: { id: string, name: string, icon: string }[] = [];
  if (templateId === 'gift_from_afar_1') {
    resourceOptions = [
      { id: 'iron', name: '철', icon: '⛏️' }, { id: 'silk', name: '비단', icon: '🧣' },
      { id: 'wheat', name: '밀', icon: '🌾' }, { id: 'spice', name: '향료', icon: '🏺' }
    ];
  } else if (templateId === 'gift_from_afar_2') {
    resourceOptions = [
      { id: 'iron', name: '철', icon: '⛏️' }, { id: 'silk', name: '비단', icon: '🧣' },
      { id: 'spice', name: '향료', icon: '🏺' }, { id: 'spy', name: '스파이', icon: '🕵️' }
    ];
  } else if (templateId === 'gift_from_afar_3') {
    resourceOptions = [
      { id: 'silk', name: '비단', icon: '🧣' }, { id: 'wheat', name: '밀', icon: '🌾' },
      { id: 'spice', name: '향료', icon: '🏺' }, { id: 'spy', name: '스파이', icon: '🕵️' }
    ];
  } else if (templateId === 'bountiful_gift') {
    resourceOptions = [
      { id: 'iron', name: '철', icon: '⛏️' }, { id: 'silk', name: '비단', icon: '🧣' },
      { id: 'wheat', name: '밀', icon: '🌾' }, { id: 'spice', name: '향료', icon: '🏺' },
      { id: 'spy', name: '스파이', icon: '🕵️' }
    ];
  } else if (templateId === 'noble_gift') {
    resourceOptions = [
      { id: 'iron', name: '철', icon: '⛏️' }, { id: 'silk', name: '비단', icon: '🧣' },
      { id: 'wheat', name: '밀', icon: '🌾' }, { id: 'spice', name: '향료', icon: '🏺' },
      { id: 'spy', name: '스파이', icon: '🕵️' }, { id: 'nuclearMaterial', name: '우라늄', icon: '☢️' }
    ];
  }

  const selectedOpponent = players.find(p => p.id === selectedPlayerId);
  const myTechIds = currentPlayer.technologies.map(t => t.id);
  // 카드별 최대 허용 레벨
  const maxTechLevel = templateId === 'think_tank' ? 3 : (templateId === 'knowledge_sharing' ? 2 : 1);

  // 🌟 1. 내가 상대방에게서 배울 수 있는 기술 (내 국가 기준 레벨 및 피라미드 검증)
  const myValidPicks = selectedOpponent 
    ? selectedOpponent.technologies.filter(t => {
        const effectiveLv = getEffectiveTechLevel(currentPlayer.nation, t.id);
        const validation = canLearnTechInPyramid(currentPlayer, t.id);
        return effectiveLv <= maxTechLevel && validation.canResearch;
      })
    : [];

  // 🌟 2. 상대방이 나에게서 배울 수 있는 기술 (상대방 국가 기준 레벨 및 피라미드 검증)
  const opponentValidPicks = selectedOpponent
    ? currentPlayer.technologies.filter(t => {
        const effectiveLv = getEffectiveTechLevel(selectedOpponent.nation, t.id);
        const validation = canLearnTechInPyramid(selectedOpponent, t.id);
        return effectiveLv <= maxTechLevel && validation.canResearch;
      })
    : [];

  let massExileTargets: { id: string, name: string, ownerName: string, icon: string }[] = [];
  if (isMassExile) {
      const isWithin6Tiles = (targetPos: any) => {
          return currentPlayer.units.some(u => Math.abs(u.position.x - targetPos.x) + Math.abs(u.position.y - targetPos.y) <= 6) ||
                 currentPlayer.cities.some(c => Math.abs(c.position.x - targetPos.x) + Math.abs(c.position.y - targetPos.y) <= 6);
      };
      otherPlayers.forEach(p => {
          p.units.forEach(u => {
              if (isWithin6Tiles(u.position)) massExileTargets.push({ id: u.id, name: '유닛', ownerName: p.name, icon: '♟️' });
          });
          if ((p as any).placedGreatPeople) {
              (p as any).placedGreatPeople.forEach((gp:any) => {
                  if (gp.position && isWithin6Tiles(gp.position)) massExileTargets.push({ id: gp.id, name: '위인', ownerName: p.name, icon: '🌟' });
              });
          }
      });
  }

  const toggleUnitSelection = (id: string) => {
      if (selectedUnitIds.includes(id)) setSelectedUnitIds(selectedUnitIds.filter(uid => uid !== id));
      else {
          if (selectedUnitIds.length >= 2) return alert("최대 2개까지만 선택할 수 있습니다.");
          setSelectedUnitIds([...selectedUnitIds, id]);
      }
  };

  const getCityBonus = () => templateId === 'presidents_day' ? 8 : (templateId === 'queens_day' ? 6 : 4);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-purple-500 rounded-xl p-6 shadow-2xl max-w-md w-full">
        
        {/* 🔥 시민 봉기 UI */}
        {isCivilUprising && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🔥</span> 시민 봉기</h2>
            <p className="text-slate-300 mb-6 text-sm">무정부 상태로 만들 상대 플레이어를 선택하세요.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {otherPlayers.map(p => (
                <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`w-full p-3 rounded-lg text-left font-bold transition-colors ${selectedPlayerId === p.id ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 🎁 선물 시리즈 UI */}
        {(isGift || isBountifulGift) && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🎁</span> {isGift ? '멀리서 온 선물' : '자원 획득'}</h2>
            <p className="text-slate-300 mb-4 text-sm">{isGift ? '획득할 자원과 화폐를 선물할 대상을 선택하세요.' : '획득할 비밀 자원을 1개 선택하세요.'}</p>
            
            <h3 className="text-amber-400 font-bold mb-2 text-sm">1. 일회성 자원 획득 (나)</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {resourceOptions.map(r => (
                <button key={r.id} onClick={() => setSelectedResource(r.id)} className={`p-2 rounded-lg flex items-center gap-2 justify-center font-bold transition-colors border ${selectedResource === r.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                   <span className="text-lg">{r.icon}</span> {r.name}
                </button>
              ))}
            </div>

            {isGift && (
              <>
                <h3 className="text-amber-400 font-bold mb-2 text-sm">2. 화폐 1개 선물 (상대방)</h3>
                <div className="space-y-2 mb-6 max-h-32 overflow-y-auto pr-1">
                   {otherPlayers.map(p => (
                    <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`w-full p-2 rounded-lg text-left font-bold transition-colors ${selectedPlayerId === p.id ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* 💡 기술 교환 UI */}
        {isIdeaShare && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>💡</span> 과학 동맹 ({templateId === 'think_tank' ? '싱크탱크' : '지식 공유'})</h2>
            
            {ideaShareStep === 0 && (
              <>
                <p className="text-slate-300 mb-4 text-sm">지식을 교환할 상대를 선택하세요.</p>
                <div className="space-y-2 mb-4 max-h-32 overflow-y-auto pr-1">
                   {otherPlayers.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPlayerId(p.id); setIdeaShareStep(1); }} className="w-full p-2 rounded-lg text-left font-bold transition-colors bg-slate-700 hover:bg-slate-600 text-slate-300">
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {ideaShareStep === 1 && selectedOpponent && (
              <>
                <h3 className="text-blue-400 font-bold mb-2 text-sm">Step 1: {currentPlayer.name}님의 선택 (최대 {maxTechLevel}단계)</h3>
                <p className="text-xs text-slate-400 mb-2">상대방의 기술 중 내 피라미드 조건에 맞는 기술만 나타납니다.</p>
                <div className="grid grid-cols-2 gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
                  {myValidPicks.length > 0 ? (
                    myValidPicks.map(t => (
                      <button key={t.id} onClick={() => setSelectedTechId(t.id)} className={`p-2 rounded-lg text-sm font-bold transition-colors border ${selectedTechId === t.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                         {t.name}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-slate-400 text-center py-2 bg-slate-700/50 rounded-lg">배울 수 있는 상대방 기술이 없습니다.</div>
                  )}
                </div>
                <button onClick={() => setIdeaShareStep(2)} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors">
                  {selectedTechId ? "결정 완료 (다음 사람 선택으로)" : "배울 기술 없음 (스킵)"}
                </button>
              </>
            )}

            {ideaShareStep === 2 && selectedOpponent && (
              <>
                <h3 className="text-red-400 font-bold mb-2 text-sm">Step 2: {selectedOpponent.name}님의 선택 (최대 {maxTechLevel}단계)</h3>
                <p className="text-xs text-slate-400 mb-2">내 기술 중 상대방 피라미드 조건에 맞는 기술만 나타납니다.</p>
                <div className="grid grid-cols-2 gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
                  {opponentValidPicks.length > 0 ? (
                    opponentValidPicks.map(t => (
                      <button key={t.id} onClick={() => setOpponentSelectedTechId(t.id)} className={`p-2 rounded-lg text-sm font-bold transition-colors border ${opponentSelectedTechId === t.id ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                         {t.name}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-slate-400 text-center py-2 bg-slate-700/50 rounded-lg">상대방이 배울 수 있는 기술이 없습니다.</div>
                  )}
                </div>
                <button onClick={() => {
                   playCultureCard(activeCardTargeting.cardId, { opponentId: selectedPlayerId, techId: selectedTechId, opponentTechId: opponentSelectedTechId });
                   cancelCardTargeting();
                }} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors">
                  교환 확정 (카드 발동)
                </button>
              </>
            )}
          </>
        )}

        {/* 🌪️ 집단 망명 UI */}
        {isMassExile && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🌪️</span> 집단 망명</h2>
            <p className="text-slate-300 mb-4 text-sm">6칸 이내에 있는 적의 유닛이나 위인을 최대 2개까지 선택해 제거하세요.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {massExileTargets.length > 0 ? (
                massExileTargets.map(t => {
                  const isSelected = selectedUnitIds.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleUnitSelection(t.id)} className={`w-full p-3 rounded-lg flex items-center justify-between font-bold transition-colors border ${isSelected ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                      <span>{t.icon} {t.ownerName}의 {t.name}</span>
                      {isSelected && <span>✔️ 선택됨</span>}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-slate-400 bg-slate-700/50 rounded-lg text-sm">6칸 이내에 제거할 수 있는 적 유닛이 없습니다.</div>
              )}
            </div>
          </>
        )}

        {/* 👑 도시 생산력 부스팅 UI */}
        {isCityBoost && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>👑</span> 도시 생산력 부스팅</h2>
            <p className="text-slate-300 mb-4 text-sm">이번 턴에 생산력을 크게 올릴 내 도시를 선택하세요.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {currentPlayer.cities.length > 0 ? (
                currentPlayer.cities.map(c => (
                  <button key={c.id} onClick={() => setSelectedCityId(c.id)} className={`w-full p-4 rounded-lg text-left font-bold transition-colors border flex justify-between items-center ${selectedCityId === c.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                    <span>🏢 {c.name}</span>
                    <span className="text-sm text-amber-400">생산력 +{getCityBonus()}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 bg-slate-700/50 rounded-lg text-sm">보유한 도시가 없습니다.</div>
              )}
            </div>
          </>
        )}
        
        <div className="flex gap-4 pt-2 border-t border-slate-700">
           <button onClick={handleConfirm} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors">
             카드 발동
           </button>
           <button onClick={cancelCardTargeting} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-lg transition-colors">
             취소
           </button>
        </div>
      </div>
    </div>
  );
};