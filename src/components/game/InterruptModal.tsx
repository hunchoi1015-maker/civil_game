// src/components/game/InterruptModal.tsx

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { hasActiveWonder } from '../../store/helpers/playerHelpers';

export const InterruptModal: React.FC = () => {
  const { players, interruptState, passInterrupt, useSpyCounter } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(7);

  const currentResponder = players.find(p => p.id === interruptState.currentResponderId);
  const topAction = interruptState.actionStack[interruptState.actionStack.length - 1];

  useEffect(() => {
    if (!interruptState.timerEndsAt || !interruptState.currentResponderId) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((interruptState.timerEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        passInterrupt();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [interruptState.timerEndsAt, interruptState.currentResponderId, passInterrupt]);

  if (!interruptState.currentResponderId || !topAction) return null;

  // 🌟 [수정] 방어권(UN, 빵과 서커스, 스파이, 마상시합) 여부를 각각 분리해서 계산
  const hasSpy = (currentResponder?.spies || 0) > 0;
  const isTargetMe = topAction?.actionType === 'culture_card' && 
                     (topAction.payload?.targetPlayerId === currentResponder?.id || 
                      topAction.payload?.opponentId === currentResponder?.id);
  
  const canUnDefense = isTargetMe && hasActiveWonder(currentResponder?.id || '', 'un', useGameStore.getState().map, players);
  const canBreadDefense = isTargetMe && (currentResponder?.cultureEventCards?.some(c => c.templateId === 'bread_and_circuses') ?? false);
  
  // 🌟 [추가] 마상시합은 타겟이 내가 아니어도(문화 카드 대상이기만 하면) 사용 가능!
  const canJoustingDefense = topAction?.actionType === 'culture_card' && (currentResponder?.cultureEventCards?.some(c => c.templateId === 'jousting') ?? false);
  const canPrimeTimeDefense = (topAction?.actionType === 'culture_card' || topAction?.actionType === 'resource_ability') && 
                              (currentResponder?.cultureEventCards?.some(c => c.templateId === 'prime_time_tv') ?? false);

  let canSpyDefense = false;
  if (topAction.actionType === 'culture_card') {
      const hasCivilService = currentResponder?.technologies.some(t => t.id === 'civil_service') ?? false;
      canSpyDefense = hasCivilService && hasSpy;
  } else if (topAction.actionType === 'resource_ability') {
      const hasMassMedia = currentResponder?.technologies.some(t => t.id === 'mass_media') ?? false;
      const hasUsedMassMedia = currentResponder?.hasUsedMassMediaThisTurn ?? false;
      canSpyDefense = hasMassMedia && hasSpy && !hasUsedMassMedia;
  }

  // 🌟 [수정] 넷 중 하나라도 가능하면 방어 권한 획득
  const canCounter = canUnDefense || canBreadDefense || canSpyDefense || canJoustingDefense|| canPrimeTimeDefense;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md font-serif">
      <div className="panel-texture border-red-900/80 rounded-2xl p-8 shadow-[0_0_40px_rgba(220,38,38,0.2)] max-w-md w-full text-center transform transition-all scale-105">
        <div className="panel-content">
          <h2 className="text-3xl font-black text-red-500 mb-3 animate-pulse text-shadow-[0_0_15px_rgba(239,68,68,0.8)] tracking-wider">
            ⚠️ 액션 감지 ⚠️
          </h2>
          <p className="text-amber-100/90 mb-6 leading-relaxed">
            누군가 <span className="text-amber-400 font-bold text-glow-gold px-1">
              {topAction.actionType === 'culture_card' ? '문화 이벤트 카드' : '기술 스킬'}
            </span>를 사용했습니다!
          </p>

          <div className="text-lg text-amber-50 mb-5 bg-slate-950/50 py-2 rounded-lg border border-slate-700 shadow-inner">
            <span className="font-bold text-blue-400 drop-shadow-md">{currentResponder?.name}</span>님의 결정을 대기 중...
          </div>

          <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden mb-4 border border-slate-700 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              style={{ width: `${(timeLeft / 7) * 100}%` }}
            />
          </div>
          <div className="text-5xl font-cinzel font-black text-amber-400 mb-8 text-glow-gold drop-shadow-lg">
            00:0{timeLeft}
          </div>

          <div className="flex flex-col gap-3 justify-center mt-4">
            {canUnDefense && (
              <button onClick={() => useSpyCounter(currentResponder!.id, topAction.id, 'un')} className="px-4 py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg border border-blue-400 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <span className="text-xl drop-shadow">🌐</span> 국제연합 거부권 행사 <span className="text-xs text-blue-200 ml-1 font-sans">(무료)</span>
              </button>
            )}
            
            {canBreadDefense && (
              <button onClick={() => useSpyCounter(currentResponder!.id, topAction.id, 'bread')} className="px-4 py-3.5 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg border border-indigo-400 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <span className="text-xl drop-shadow">🍞</span> '빵과 서커스'로 방어
              </button>
            )}

            {canJoustingDefense && (
              <button onClick={() => useSpyCounter(currentResponder!.id, topAction.id, 'jousting')} className="px-4 py-3.5 bg-gradient-to-r from-fuchsia-700 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-lg border border-fuchsia-400 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <span className="text-xl drop-shadow">🏇</span> '마상시합'으로 방어
              </button>
            )}

            {canPrimeTimeDefense && (
              <button onClick={() => useSpyCounter(currentResponder!.id, topAction.id, 'prime_time_tv')} className="px-4 py-3.5 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-amber-950 font-black rounded-xl shadow-glow-gold border border-yellow-300 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <span className="text-xl drop-shadow">📺</span> '황금시간대 TV' 무효화
              </button>
            )}

            {canSpyDefense && (
              <button onClick={() => useSpyCounter(currentResponder!.id, topAction.id, 'spy')} className="px-4 py-3.5 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-xl shadow-lg border border-red-500 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <span className="text-xl drop-shadow">🕵️</span> 방첩 스파이 파견 <span className="font-cinzel text-red-200 ml-1">(-1)</span>
              </button>
            )}
            
            <button
              onClick={() => passInterrupt()}
              className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-600 shadow-inner flex items-center justify-center transition-colors mt-2"
            >
              ⏭️ 개입하지 않음 (통과)
            </button>
          </div>
          
          {!canCounter && topAction.actionType === 'culture_card' && (
            <p className="text-xs text-slate-500 mt-5 font-sans bg-slate-900/50 py-2 rounded">공공서비스 기술과 스파이가 없어 개입할 수 없습니다.</p>
          )}
          {!canCounter && topAction.actionType === 'resource_ability' && (
            <p className="text-xs text-slate-500 mt-5 font-sans bg-slate-900/50 py-2 rounded">대중매체 기술과 스파이가 없거나 이미 방어권을 소모했습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};