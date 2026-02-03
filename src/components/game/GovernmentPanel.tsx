import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { GOVERNMENT_EFFECTS, GovernmentType } from '../../types';
import { GOVERNMENTS } from '../../constants/governments';
import { TECHNOLOGIES } from '../../constants/technologies';
import clsx from 'clsx';

const GOVERNMENT_ICONS: Record<GovernmentType, string> = {
  despotism: '👑',
  monarchy: '🏰',
  democracy: '🗳️',
  republic: '⚖️',
  communism: '☭',
  fundamentalism: '⛪',
};

export function GovernmentPanel() {
  const { players, currentPlayerIndex, currentPhase, changeGovernment } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [showModal, setShowModal] = useState(false);

  const canChangeGovernment = currentPhase === 'start';
  const currentGov = currentPlayer.government;
  const researchedTechIds = currentPlayer.technologies.map(t => t.id);

  const isGovUnlocked = (gov: GovernmentType): boolean => {
    const govDef = GOVERNMENTS[gov];
    return govDef.requiredTech === null || researchedTechIds.includes(govDef.requiredTech);
  };

  const getRequiredTechName = (gov: GovernmentType): string | null => {
    const govDef = GOVERNMENTS[gov];
    if (!govDef.requiredTech) return null;
    const tech = TECHNOLOGIES.find(t => t.id === govDef.requiredTech);
    return tech?.name || govDef.requiredTech;
  };

  const handleChangeGovernment = (gov: GovernmentType) => {
    if (!isGovUnlocked(gov)) return;
    changeGovernment(currentPlayer.id, gov);
    setShowModal(false);
  };

  return (
    <>
      {/* 현재 정치체제 표시 */}
      <div className="bg-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-medium">정치체제</h4>
          {canChangeGovernment && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
            >
              변경
            </button>
          )}
        </div>

        {currentGov && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{GOVERNMENT_ICONS[currentGov]}</span>
            <div>
              <div className="text-white font-medium">{GOVERNMENT_EFFECTS[currentGov].name}</div>
              <div className="text-xs text-slate-400">{GOVERNMENT_EFFECTS[currentGov].description}</div>
            </div>
          </div>
        )}

        {/* 보너스 표시 */}
        {currentGov && (
          <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
            <div className={clsx(
              'p-1 rounded text-center',
              GOVERNMENT_EFFECTS[currentGov].tradeBonus > 0 ? 'bg-yellow-900/50 text-yellow-400' :
              GOVERNMENT_EFFECTS[currentGov].tradeBonus < 0 ? 'bg-red-900/50 text-red-400' :
              'bg-slate-600 text-slate-400'
            )}>
              교역 {GOVERNMENT_EFFECTS[currentGov].tradeBonus >= 0 ? '+' : ''}{GOVERNMENT_EFFECTS[currentGov].tradeBonus}
            </div>
            <div className={clsx(
              'p-1 rounded text-center',
              GOVERNMENT_EFFECTS[currentGov].productionBonus > 0 ? 'bg-orange-900/50 text-orange-400' :
              'bg-slate-600 text-slate-400'
            )}>
              생산 +{GOVERNMENT_EFFECTS[currentGov].productionBonus}
            </div>
            <div className={clsx(
              'p-1 rounded text-center',
              GOVERNMENT_EFFECTS[currentGov].militaryBonus > 0 ? 'bg-red-900/50 text-red-400' :
              'bg-slate-600 text-slate-400'
            )}>
              군사 +{GOVERNMENT_EFFECTS[currentGov].militaryBonus}
            </div>
          </div>
        )}

        {!canChangeGovernment && (
          <p className="text-xs text-slate-500 mt-2">
            차례 시작 단계에서만 변경 가능
          </p>
        )}
      </div>

      {/* 정치체제 선택 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-lg p-6 w-[700px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-4">정치체제 선택</h3>

            {/* 비교 테이블 */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left text-slate-400 p-2">정치체제</th>
                    <th className="text-center text-yellow-400 p-2">교역</th>
                    <th className="text-center text-orange-400 p-2">생산</th>
                    <th className="text-center text-red-400 p-2">군사</th>
                    <th className="text-center text-slate-400 p-2">선택</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(GOVERNMENT_EFFECTS) as GovernmentType[]).map((gov) => {
                    const effect = GOVERNMENT_EFFECTS[gov];
                    const isSelected = currentGov === gov;
                    const unlocked = isGovUnlocked(gov);
                    const requiredTechName = getRequiredTechName(gov);

                    return (
                      <tr
                        key={gov}
                        className={clsx(
                          'border-b border-slate-700 transition-colors',
                          !unlocked ? 'opacity-50' :
                          isSelected ? 'bg-amber-600/20' : 'hover:bg-slate-700'
                        )}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{unlocked ? GOVERNMENT_ICONS[gov] : '🔒'}</span>
                            <div>
                              <div className="text-white font-medium">{effect.name}</div>
                              <div className="text-xs text-slate-400">{effect.description}</div>
                              {!unlocked && requiredTechName && (
                                <div className="text-xs text-red-400">필요 기술: {requiredTechName}</div>
                              )}
                            </div>
                            {isSelected && <span className="text-xs bg-amber-500 px-1 rounded">현재</span>}
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <span className={clsx(
                            'px-2 py-1 rounded',
                            effect.tradeBonus > 0 ? 'bg-yellow-900/50 text-yellow-400' :
                            effect.tradeBonus < 0 ? 'bg-red-900/50 text-red-400' :
                            'text-slate-500'
                          )}>
                            {effect.tradeBonus > 0 ? '+' : ''}{effect.tradeBonus}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={clsx(
                            'px-2 py-1 rounded',
                            effect.productionBonus > 0 ? 'bg-orange-900/50 text-orange-400' :
                            'text-slate-500'
                          )}>
                            +{effect.productionBonus}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={clsx(
                            'px-2 py-1 rounded',
                            effect.militaryBonus > 0 ? 'bg-red-900/50 text-red-400' :
                            effect.militaryBonus < 0 ? 'bg-blue-900/50 text-blue-400' :
                            'text-slate-500'
                          )}>
                            {effect.militaryBonus > 0 ? '+' : ''}{effect.militaryBonus}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <button
                            onClick={() => handleChangeGovernment(gov)}
                            disabled={isSelected || !unlocked}
                            className={clsx(
                              'px-3 py-1 rounded text-sm transition-colors',
                              isSelected || !unlocked
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-amber-600 hover:bg-amber-500 text-white'
                            )}
                          >
                            {isSelected ? '현재' : !unlocked ? '잠김' : '선택'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 현재 vs 선택 비교 카드 (카드 스타일 유지) */}
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(GOVERNMENT_EFFECTS) as GovernmentType[]).map((gov) => {
                const effect = GOVERNMENT_EFFECTS[gov];
                const isSelected = currentGov === gov;
                const unlocked = isGovUnlocked(gov);
                const requiredTechName = getRequiredTechName(gov);

                return (
                  <button
                    key={gov}
                    onClick={() => handleChangeGovernment(gov)}
                    disabled={isSelected || !unlocked}
                    className={clsx(
                      'p-3 rounded-lg text-left transition-all',
                      !unlocked
                        ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-amber-600 ring-2 ring-amber-400'
                          : 'bg-slate-700 hover:bg-slate-600'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{unlocked ? GOVERNMENT_ICONS[gov] : '🔒'}</span>
                      <div className="text-white font-semibold text-sm">{effect.name}</div>
                    </div>

                    {!unlocked && requiredTechName ? (
                      <div className="text-xs text-red-400">필요 기술: {requiredTechName}</div>
                    ) : (
                      <div className="flex gap-1 text-xs">
                        <span className={clsx(
                          'px-1 rounded',
                          effect.tradeBonus !== 0 ? (effect.tradeBonus > 0 ? 'text-yellow-400' : 'text-red-400') : 'text-slate-500'
                        )}>
                          교{effect.tradeBonus >= 0 ? '+' : ''}{effect.tradeBonus}
                        </span>
                        <span className={clsx(
                          'px-1 rounded',
                          effect.productionBonus > 0 ? 'text-orange-400' : 'text-slate-500'
                        )}>
                          생+{effect.productionBonus}
                        </span>
                        <span className={clsx(
                          'px-1 rounded',
                          effect.militaryBonus !== 0 ? (effect.militaryBonus > 0 ? 'text-red-400' : 'text-blue-400') : 'text-slate-500'
                        )}>
                          군{effect.militaryBonus >= 0 ? '+' : ''}{effect.militaryBonus}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
