import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const CultureCardTargetModal: React.FC = () => {
  const { players, currentPlayerIndex, activeCardTargeting, cancelCardTargeting, playCultureCard } = useGameStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // 모달이 열릴 때마다 선택값 초기화
  useEffect(() => {
    setSelectedPlayerId(null);
    setSelectedResource(null);
  }, [activeCardTargeting?.cardId]);

  if (!activeCardTargeting) return null;

  const templateId = activeCardTargeting.templateId;
  const isCivilUprising = templateId === 'civil_uprising';
  const isGift = templateId.startsWith('gift_from_afar');

  // 플레이어 지정 카드가 아니면 렌더링하지 않음 (맵 타겟팅으로 넘어감)
  if (!isCivilUprising && !isGift) return null;

  const currentPlayer = players[currentPlayerIndex];
  const otherPlayers = players.filter(p => p.id !== currentPlayer.id);

  const handleConfirm = () => {
    if (isCivilUprising) {
      if (!selectedPlayerId) return alert("대상을 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId });
      cancelCardTargeting();
    } else if (isGift) {
      if (!selectedPlayerId || !selectedResource) return alert("자원과 대상을 모두 선택해주세요.");
      playCultureCard(activeCardTargeting.cardId, { targetPlayerId: selectedPlayerId, resourceType: selectedResource });
      cancelCardTargeting();
    }
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
                <button 
                  key={p.id} 
                  onClick={() => setSelectedPlayerId(p.id)} 
                  className={`w-full p-3 rounded-lg text-left font-bold transition-colors ${selectedPlayerId === p.id ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 🎁 멀리서 온 선물 UI */}
        {isGift && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><span>🎁</span> 멀리서 온 선물</h2>
            <p className="text-slate-300 mb-4 text-sm">획득할 자원과, 화폐를 선물할 플레이어를 선택하세요.</p>
            
            <h3 className="text-amber-400 font-bold mb-2 text-sm">1. 일회성 자원 획득 (나)</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {resourceOptions.map(r => (
                <button 
                  key={r.id} 
                  onClick={() => setSelectedResource(r.id)} 
                  className={`p-2 rounded-lg flex items-center gap-2 justify-center font-bold transition-colors border ${selectedResource === r.id ? 'bg-amber-600 border-amber-400 text-white shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                >
                   <span className="text-lg">{r.icon}</span> {r.name}
                </button>
              ))}
            </div>

            <h3 className="text-amber-400 font-bold mb-2 text-sm">2. 화폐 1개 선물 (상대방)</h3>
            <div className="space-y-2 mb-6 max-h-32 overflow-y-auto pr-1">
               {otherPlayers.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => setSelectedPlayerId(p.id)} 
                  className={`w-full p-2 rounded-lg text-left font-bold transition-colors ${selectedPlayerId === p.id ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                  {p.name}
                </button>
              ))}
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