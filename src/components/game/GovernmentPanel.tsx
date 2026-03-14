// src/components/game/GovernmentPanel.tsx 파일 전체를 아래로 교체해주세요.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { GovernmentType } from '../../types';
import { GOVERNMENTS } from '../../constants/governments';
import { TECHNOLOGIES } from '../../constants/technologies';
import clsx from 'clsx';
import { hasActiveWonder } from '../../store/helpers/playerHelpers';

const GOVERNMENT_ICONS: Record<GovernmentType, string> = {
  despotism: '👑',
  monarchy: '🏰',
  democracy: '🗳️',
  republic: '⚖️',
  communism: '☭',
  fundamentalism: '⛪',
  feudalism: '🛡️', 
  anarchy: '🔥'
};

export function GovernmentPanel() {
  const { map, players, currentPlayerIndex, currentPhase, changeGovernment } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  
  const hasPyramids = map ? hasActiveWonder(currentPlayer.id, 'pyramids', map, players) : false;
  const [showModal, setShowModal] = useState(false);

  const canChangeGovernment = currentPhase === 'start';
  const currentGov = currentPlayer.government || 'despotism'; 
  const researchedTechIds = currentPlayer.technologies.map(t => t.id);

  // 🌟 [추가] 상대의 공격으로 인한 강제 무정부 상태(타이머) 여부 확인
  const forcedAnarchy = (currentPlayer.anarchyTurnsLeft || 0) > 0;

  const isGovUnlocked = (gov: GovernmentType): boolean => {
    if (gov === 'anarchy' || hasPyramids) return true;
    const govDef = GOVERNMENTS[gov];
    return govDef.requiredTech === null || researchedTechIds.includes(govDef.requiredTech);
  };

  const getCanSelect = (gov: GovernmentType): boolean => {
    if (forcedAnarchy) return false; // 🌟 강제 폭동 기간 중엔 꼼수로 다른 체제 선택 불가!
    if (currentGov === gov) return false;
    if (!isGovUnlocked(gov)) return false;

    if (hasPyramids || currentGov === 'anarchy' || currentPlayer.freeGovernmentSwitch) {
      return true;
    }
    
    return gov === 'anarchy';
  };

  const getRequiredTechName = (gov: GovernmentType): string | null => {
    const govDef = GOVERNMENTS[gov];
    if (!govDef.requiredTech) return null;
    const tech = TECHNOLOGIES.find(t => t.id === govDef.requiredTech);
    return tech?.name || govDef.requiredTech;
  };

  const handleChangeGovernment = (gov: GovernmentType) => {
    if (!getCanSelect(gov)) return;
    
    if (gov === 'anarchy') {
        const confirmAnarchy = window.confirm("무정부 상태로 돌입하시겠습니까?\n이번 턴 '도시 경영' 단계에서 수도는 아무 행동도 할 수 없게 됩니다.");
        if (!confirmAnarchy) return;
    }

    changeGovernment(currentPlayer.id, gov);
    setShowModal(false);
  };

  return (
    <>
      <div className="bg-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-medium">정치체제</h4>
          
          {/* 🌟 강제 무정부가 아닐 때만 변경 버튼 노출 */}
          {canChangeGovernment && !forcedAnarchy && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors relative"
            >
              변경
              {currentPlayer.freeGovernmentSwitch && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
              )}
            </button>
          )}

          {/* 🌟 상대 공격에 의해 묶인 경우 경고 라벨 렌더링 */}
          {forcedAnarchy && (
            <span className="text-xs bg-red-900/80 text-red-200 px-2 py-1 rounded border border-red-500 animate-pulse font-bold shadow-md">
                🔥 폭동 진압 중 (변경 불가)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-3xl">{GOVERNMENT_ICONS[currentGov]}</span>
          <div>
            <div className="text-white font-medium flex items-center gap-2">
                {GOVERNMENTS[currentGov]?.name}
            </div>
            <div className="text-xs text-slate-300 mt-1 line-clamp-3 leading-snug">
                {GOVERNMENTS[currentGov]?.description}
            </div>
          </div>
        </div>

        {!canChangeGovernment && !forcedAnarchy && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            차례 시작 단계에서만 변경 가능
          </p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-white">정치체제 선택</h3>
                {currentPlayer.freeGovernmentSwitch && (
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                        ✨ 이번 턴 한정 무료 전환 기회!
                    </span>
                )}
            </div>
            
            <p className="text-sm text-slate-400 mb-6">
                {currentPlayer.freeGovernmentSwitch 
                    ? "방금 연구한 기술의 효과로 무정부 페널티 없이 즉시 체제를 바꿀 수 있습니다." 
                    : currentGov === 'anarchy' 
                        ? "무정부 상태를 거쳤습니다! 새롭게 도입할 정치체제를 선택하세요." 
                        : "다른 정치체제로 변경하려면 반드시 '무정부'를 먼저 선언하여 한 턴의 수도 마비 페널티를 거쳐야 합니다."}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(GOVERNMENTS) as GovernmentType[]).map((gov) => {
                const effect = GOVERNMENTS[gov];
                const isSelected = currentGov === gov;
                const unlocked = isGovUnlocked(gov);
                const canSelect = getCanSelect(gov);
                const requiredTechName = getRequiredTechName(gov);

                return (
                  <button
                    key={gov}
                    onClick={() => handleChangeGovernment(gov)}
                    disabled={!canSelect}
                    className={clsx(
                      'p-4 rounded-xl text-left transition-all border flex flex-col h-full',
                      isSelected ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500' :
                      !unlocked ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed' :
                      canSelect ? 'bg-slate-700 border-slate-600 hover:border-amber-400 hover:bg-slate-600 hover:-translate-y-1' : 
                      'bg-slate-800 border-slate-700 opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{unlocked ? GOVERNMENT_ICONS[gov] : '🔒'}</span>
                        <div className="text-white text-lg font-bold">{effect.name}</div>
                      </div>
                      {isSelected && <span className="text-xs bg-amber-500 text-black font-bold px-2 py-1 rounded">현재 체제</span>}
                    </div>

                    <div className="text-sm text-slate-300 flex-grow leading-relaxed">
                        {effect.description}
                    </div>

                    {!unlocked && requiredTechName && (
                      <div className="text-xs text-red-400 mt-3 font-medium bg-red-900/30 p-2 rounded">
                        💡 필요 기술: {requiredTechName}
                      </div>
                    )}
                    
                    {unlocked && !isSelected && (
                        <div className="mt-4 pt-3 border-t border-slate-600/50 text-right">
                            <span className={clsx("text-sm font-bold", canSelect ? (gov === 'anarchy' ? "text-red-400" : "text-amber-400") : "text-slate-500")}>
                                {canSelect ? (gov === 'anarchy' ? '🔥 무정부 돌입 (수도 마비)' : '✨ 이 체제로 전환') : '선택 불가 (무정부를 거쳐야 함)'}
                            </span>
                        </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors text-lg"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}