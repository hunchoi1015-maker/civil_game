import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const InterruptModal: React.FC = () => {
  const { players, interruptState, passInterrupt, useSpyCounter } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(7);

  const currentResponder = players.find(p => p.id === interruptState.currentResponderId);
  const topAction = interruptState.actionStack[interruptState.actionStack.length - 1];

  // 🌟 타이머 동기화 로직
  useEffect(() => {
    if (!interruptState.timerEndsAt || !interruptState.currentResponderId) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((interruptState.timerEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);

      // 타이머가 0이 되면 자동으로 '통과' 처리
      if (remaining <= 0) {
        clearInterval(interval);
        passInterrupt();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [interruptState.timerEndsAt, interruptState.currentResponderId, passInterrupt]);

  // 대기 중인 상태가 아니면 렌더링하지 않음 (숨김 처리)
  if (!interruptState.currentResponderId || !topAction) return null;

  // 개입할 수 있는 조건 검사 (공공서비스 기술 보유 & 스파이 1개 이상)
  const hasCivilService = currentResponder?.technologies.some(t => t.id === 'civil_service');
  const hasSpy = (currentResponder?.spies || 0) > 0;
  const canCounter = hasCivilService && hasSpy && topAction.actionType === 'culture_card';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-amber-500 rounded-xl p-6 shadow-2xl max-w-md w-full text-center transform transition-all scale-105">
        
        <h2 className="text-2xl font-bold text-red-400 mb-2 animate-pulse">⚠️ 액션 감지 ⚠️</h2>
        <p className="text-slate-300 mb-6">
          누군가 <span className="text-amber-400 font-bold">{topAction.actionType === 'culture_card' ? '문화 이벤트 카드' : '특수 능력'}</span>를 사용했습니다!
        </p>

        <div className="text-lg text-white mb-4">
          현재 <span className="font-bold text-blue-300">{currentResponder?.name}</span>님의 결정을 기다리는 중...
        </div>

        {/* 타이머 진행 바 */}
        <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-amber-500 transition-all duration-100 ease-linear"
            style={{ width: `${(timeLeft / 7) * 100}%` }}
          />
        </div>
        <div className="text-4xl font-mono text-amber-400 mb-8">{timeLeft}초</div>

        <div className="flex gap-4 justify-center">
          {canCounter && (
            <button
              onClick={() => useSpyCounter(currentResponder!.id, topAction.id)}
              className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-colors"
            >
              🕵️ 스파이 파견하여 막기 (-1)
            </button>
          )}
          
          <button
            onClick={() => passInterrupt()}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-colors"
          >
            ⏭️ 개입하지 않음 (통과)
          </button>
        </div>
        
        {!canCounter && (
          <p className="text-sm text-slate-400 mt-4">
            (공공서비스 기술과 스파이가 없어 개입할 수 없습니다.)
          </p>
        )}

      </div>
    </div>
  );
};