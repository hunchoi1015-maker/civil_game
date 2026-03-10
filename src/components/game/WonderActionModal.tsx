// src/components/game/WonderActionModal.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';
// 🌟 낡은 함수 대신 통합된 피라미드 검증 엔진을 가져옵니다.
import { canLearnTechInPyramid } from '../../store/helpers/validationHelpers';

export const WonderActionModal: React.FC = () => {
  const { 
      players, currentPlayerIndex, 
      pendingSydneyOperaIds, pendingStatueOfLibertyIds, 
      consumePendingWonder, advanceCultureTrackFree, grantFreeTech 
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  // 1. 시드니 오페라 하우스 대기열 확인
  const isSydneyPending = pendingSydneyOperaIds?.includes(currentPlayer.id);
  
  // 2. 자유의 여신상 대기열 확인
  const isStatuePending = pendingStatueOfLibertyIds?.includes(currentPlayer.id);

  const handleSydneyAdvance = () => {
      advanceCultureTrackFree();
      consumePendingWonder(currentPlayer.id, 'sydney');
  };

  const handleSydneySkip = () => {
      consumePendingWonder(currentPlayer.id, 'sydney');
  };

  // 🗽 자유의 여신상 처리 로직 (상대 기술 중 피라미드 조건을 만족하는 것만 추출)
  const getAvailableTechsToSteal = () => {
      const myTechIds = new Set(currentPlayer.technologies.map(t => t.id));
      const availableTechs = new Map<string, any>();

      players.forEach(p => {
          if (p.id === currentPlayer.id) return;
          p.technologies.forEach(tech => {
              if (!myTechIds.has(tech.id)) {
                  // 🌟 [핵심] 내 국가 기준 피라미드 룰 검사를 통과한 기술만 모달에 표시합니다!
                  const validation = canLearnTechInPyramid(currentPlayer, tech.id);
                  
                  if (validation.canResearch) {
                      availableTechs.set(tech.id, tech);
                  }
              }
          });
      });

      return Array.from(availableTechs.values());
  };

  const handleStatueSelectTech = (techId: string) => {
      grantFreeTech(currentPlayer.id, techId);
      consumePendingWonder(currentPlayer.id, 'statue');
  };

  const handleStatueSkip = () => {
      consumePendingWonder(currentPlayer.id, 'statue');
  };

  if (!isSydneyPending && !isStatuePending) return null;

  // 🎵 시드니 오페라 하우스 렌더링
  if (isSydneyPending) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border-2 border-purple-500 rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-3xl mb-4">🎵</h2>
            <h2 className="text-2xl font-bold text-white mb-2">시드니 오페라 하우스</h2>
            <p className="text-slate-300 mb-8">차례 시작 효과로 문화 트랙을 1칸 무료로 전진하시겠습니까?</p>
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleSydneyAdvance}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
              >
                1칸 무료 전진하기
              </button>
              <button 
                onClick={handleSydneySkip}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition-colors"
              >
                넘어가기
              </button>
            </div>
          </div>
        </div>
      );
  }

  // 🗽 자유의 여신상 렌더링
  if (isStatuePending) {
      const availableTechs = getAvailableTechsToSteal();

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border-2 border-blue-500 rounded-xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl mb-4">🗽</h2>
              <h2 className="text-2xl font-bold text-white mb-2">자유의 여신상</h2>
              <p className="text-slate-300">상대방의 기술 중 내 피라미드 조건에 맞는 기술을 무료로 배울 수 있습니다!</p>
            </div>

            {availableTechs.length === 0 ? (
                <div className="text-center">
                    <p className="text-red-400 mb-6">현재 피라미드 조건에 맞아 새롭게 배울 수 있는 상대방의 기술이 없습니다.</p>
                    <button 
                        onClick={handleStatueSkip}
                        className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition-colors"
                    >
                        닫기
                    </button>
                </div>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-3">
                        {availableTechs.map(tech => (
                            <button
                                key={tech.id}
                                onClick={() => handleStatueSelectTech(tech.id)}
                                className="p-3 bg-slate-700 hover:bg-blue-600 border border-slate-600 hover:border-blue-400 rounded-lg text-left transition-colors group"
                            >
                                <div className="font-bold text-blue-300 group-hover:text-white flex items-center gap-2">
                                    <span>💡</span> {tech.name} <span className="text-xs font-normal text-slate-400">Lv.{tech.level}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1 truncate group-hover:text-slate-200">
                                    {tech.description}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="text-center mt-6 pt-4 border-t border-slate-600">
                        <button 
                            onClick={handleStatueSkip}
                            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                        >
                            배우지 않고 넘어가기
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      );
  }

  return null;
};