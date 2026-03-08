// src/components/game/CultureCardTargetModal.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const CultureCardTargetModal: React.FC = () => {
  const { players, currentPlayerIndex, activeCardTargeting, cancelCardTargeting, playCultureCard } = useGameStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null); // 🌟 신규: 여왕의 날 도시 선택

  useEffect(() => {
    setSelectedPlayerId(null);
    setSelectedResource(null);
    setSelectedTechId(null);
    setSelectedUnitIds([]);
    setSelectedCityId(null); // 초기화
  }, [activeCardTargeting?.cardId]);

  if (!activeCardTargeting) return null;

  const templateId = activeCardTargeting.templateId;
  const isCivilUprising = templateId === 'civil_uprising';
  const isGift = templateId.startsWith('gift_from_afar');
  const isBountifulGift = templateId === 'bountiful_gift'; 
  const isIdeaShare = templateId === 'idea_share' || templateId === 'knowledge_sharing'; 
  const isMassExile = templateId === 'mass_exile';
  const isCityBoost = templateId === 'queens_day' || templateId === 'dictators_day'; // 🌟 신규

  // 🌟 조건에 isCityBoost 추가
  if (!isCivilUprising && !isGift && !isBountifulGift && !isIdeaShare && !isMassExile && !isCityBoost) return null;

  const currentPlayer = players[currentPlayerIndex];
  const otherPlayers = players.filter(p => p.id !== currentPlayer.id);

  const handleConfirm = () => {
    if (isCivilUprising) {
      if (!selectedPlayerId) return alert("대상을 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId });
      cancelCardTargeting();
    } else if (isGift || isBountifulGift) {
      // 🌟 풍족한 선물은 targetPlayerId가 필요 없음
      if (isGift && !selectedPlayerId) return alert("대상을 선택해주세요.");
      if (!selectedResource) return alert("자원을 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId, resourceType: selectedResource });
      cancelCardTargeting();
    } else if (isIdeaShare) {
      if (!selectedPlayerId || !selectedTechId) return alert("대상과 빼앗을 기술을 모두 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { opponentId: selectedPlayerId, techId: selectedTechId });
      cancelCardTargeting();
    }else if (isMassExile) {
      if (selectedUnitIds.length === 0) return alert("제거할 대상을 1~2개 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetUnitIds: selectedUnitIds });
      cancelCardTargeting();
    } else if (isCityBoost) {
      // 여왕의 날 / 독재자의 날 실행!
      if (!selectedCityId) return alert("부스팅할 도시를 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { cityId: selectedCityId });
      cancelCardTargeting();
    }
  };

  const handlePlayerSelect = (pId: string) => {
    setSelectedPlayerId(pId);
    setSelectedTechId(null); // 🌟 플레이어가 바뀌면 선택한 기술 초기화
  };

  // '멀리서 온 선물' 버전별 자원 선택지
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
  }

  // 🌟 '발상의 공유' 용 상대방 기술 필터링 (내가 없는 1단계 기술만)
  const selectedOpponent = players.find(p => p.id === selectedPlayerId);
  const myTechIds = currentPlayer.technologies.map(t => t.id);

  // 발상의 공유는 1단계만, 지식 공유는 2단계까지!
  const maxTechLevel = templateId === 'knowledge_sharing' ? 2 : 1; 
  
  const opponentLevelTechs = selectedOpponent 
    ? selectedOpponent.technologies.filter(t => t.level <= maxTechLevel && !myTechIds.includes(t.id))
    : [];

  let massExileTargets: { id: string, name: string, ownerName: string, icon: string }[] = [];
  if (isMassExile) {
      const isWithin6Tiles = (targetPos: any) => {
          return currentPlayer.units.some(u => Math.abs(u.position.x - targetPos.x) + Math.abs(u.position.y - targetPos.y) <= 60) ||
                 currentPlayer.cities.some(c => Math.abs(c.position.x - targetPos.x) + Math.abs(c.position.y - targetPos.y) <= 60);
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
      if (selectedUnitIds.includes(id)) {
          setSelectedUnitIds(selectedUnitIds.filter(uid => uid !== id));
      } else {
          if (selectedUnitIds.length >= 2) return alert("최대 2개까지만 선택할 수 있습니다.");
          setSelectedUnitIds([...selectedUnitIds, id]);
      }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-purple-500 rounded-xl p-6 shadow-2xl max-w-md w-full">
        
        {/* ... (시민 봉기, 멀리서 온 선물 UI 기존과 동일) ... */}
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

        {isGift && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🎁</span> 멀리서 온 선물</h2>
            <p className="text-slate-300 mb-4 text-sm">획득할 자원과, 화폐를 선물할 플레이어를 선택하세요.</p>
            <h3 className="text-amber-400 font-bold mb-2 text-sm">1. 일회성 자원 획득 (나)</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {resourceOptions.map(r => (
                <button key={r.id} onClick={() => setSelectedResource(r.id)} className={`p-2 rounded-lg flex items-center gap-2 justify-center font-bold transition-colors border ${selectedResource === r.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}>
                   <span className="text-lg">{r.icon}</span> {r.name}
                </button>
              ))}
            </div>
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
        // 풍족한 선물
        {isBountifulGift && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🎁</span> 풍족한 선물</h2>
            <p className="text-slate-300 mb-4 text-sm">획득할 자원을 1개 선택하세요. (즉시 일회성 비밀 자원 획득)</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { id: 'iron', name: '철', icon: '⛏️' }, { id: 'silk', name: '비단', icon: '🧣' },
                { id: 'wheat', name: '밀', icon: '🌾' }, { id: 'spice', name: '향료', icon: '🏺' },
                { id: 'spy', name: '스파이', icon: '🕵️' }
              ].map(r => (
                <button 
                  key={r.id} 
                  onClick={() => setSelectedResource(r.id)} 
                  className={`p-3 rounded-lg flex items-center gap-2 justify-center font-bold transition-colors border ${selectedResource === r.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                >
                   <span className="text-xl">{r.icon}</span> {r.name}
                </button>
              ))}
            </div>
          </>
        )}
        
        {/* 🌟 발상의 공유 UI 추가 */}
        {isIdeaShare && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>💡</span> 발상의 공유</h2>
            <p className="text-slate-300 mb-4 text-sm">기술을 빼앗아올 상대를 선택하세요. (내 1단계 기술 1개가 무작위로 넘어갑니다)</p>
            
            <h3 className="text-amber-400 font-bold mb-2 text-sm">1. 대상 플레이어</h3>
            <div className="space-y-2 mb-4 max-h-32 overflow-y-auto pr-1">
               {otherPlayers.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handlePlayerSelect(p.id)} 
                  className={`w-full p-2 rounded-lg text-left font-bold transition-colors ${selectedPlayerId === p.id ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {selectedPlayerId && (
              <>
                <h3 className="text-amber-400 font-bold mb-2 text-sm">2. 훔쳐올 기술 (상대방의 1단계 기술)</h3>
                <div className="grid grid-cols-2 gap-2 mb-6 max-h-40 overflow-y-auto pr-1">
                  {opponentLevelTechs.length > 0 ? (
                    opponentLevelTechs.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSelectedTechId(t.id)} 
                        className={`p-2 rounded-lg text-sm font-bold transition-colors border ${selectedTechId === t.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                      >
                         {t.name}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-sm text-slate-400 text-center py-2 bg-slate-700/50 rounded-lg">
                      상대방에게 내가 모르는 1단계 기술이 없습니다.
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* 🌟 집단 망명 UI */}
        {isMassExile && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🌪️</span> 집단 망명</h2>
            <p className="text-slate-300 mb-4 text-sm">6칸 이내에 있는 적의 유닛이나 위인을 최대 2개까지 선택해 제거하세요.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {massExileTargets.length > 0 ? (
                massExileTargets.map(t => {
                  const isSelected = selectedUnitIds.includes(t.id);
                  return (
                    <button key={t.id} 
                      onClick={() => toggleUnitSelection(t.id)} 
                      className={`w-full p-3 rounded-lg flex items-center justify-between font-bold transition-colors border ${isSelected ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                    >
                      <span>{t.icon} {t.ownerName}의 {t.name}</span>
                      {isSelected && <span>✔️ 선택됨</span>}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-slate-400 bg-slate-700/50 rounded-lg text-sm">
                  6칸 이내에 제거할 수 있는 적 유닛이 없습니다.
                </div>
              )}
            </div>
          </>
        )}
        {isCityBoost && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span>👑</span> 도시 생산력 부스팅
            </h2>
            <p className="text-slate-300 mb-4 text-sm">생산력을 영구/일시적으로 크게 올릴 내 도시를 선택하세요.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
              {currentPlayer.cities.length > 0 ? (
                currentPlayer.cities.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedCityId(c.id)} 
                    className={`w-full p-4 rounded-lg text-left font-bold transition-colors border flex justify-between items-center ${selectedCityId === c.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                  >
                    <span>🏢 {c.name}</span>
                    <span className="text-sm bg-slate-800 px-2 py-1 rounded">현재 생산력: {c.production}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 bg-slate-700/50 rounded-lg text-sm">
                  현재 보유한 도시가 없습니다.
                </div>
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