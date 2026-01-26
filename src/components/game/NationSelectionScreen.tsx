import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { NATIONS, NationType } from '../../types/nation';
import clsx from 'clsx';

const PLAYER_COLORS: Record<string, string> = {
  red: 'border-red-500 bg-red-500/20',
  blue: 'border-blue-500 bg-blue-500/20',
  green: 'border-green-500 bg-green-500/20',
  yellow: 'border-yellow-500 bg-yellow-500/20',
};

export function NationSelectionScreen() {
  const { players, setupState, selectNation } = useGameStore();

  const currentPlayerIndex = setupState.currentSetupPlayer;
  const currentPlayer = players[currentPlayerIndex];
  const selectedNations = setupState.selectedNations;

  const handleSelectNation = (nationId: NationType) => {
    // 이미 선택된 국가인지 확인
    if (selectedNations.includes(nationId)) {
      return;
    }
    selectNation(currentPlayerIndex, nationId);
  };

  const allNations = Object.values(NATIONS);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-500 mb-2">국가 선택</h1>
          <p className="text-slate-400">플레이할 국가를 선택하세요</p>
        </div>

        {/* 현재 플레이어 정보 */}
        <motion.div
          key={currentPlayerIndex}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={clsx(
            'mb-8 p-4 rounded-lg border-2 text-center',
            PLAYER_COLORS[currentPlayer.color]
          )}
        >
          <h2 className="text-2xl font-bold text-white">{currentPlayer.name}</h2>
          <p className="text-slate-400 mt-1">플레이어 {currentPlayerIndex + 1} / {players.length}</p>
        </motion.div>

        {/* 국가 목록 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {allNations.map((nation) => {
            const isSelected = selectedNations.includes(nation.id);
            const isCurrentSelection = currentPlayer.nation === nation.id && selectedNations[currentPlayerIndex] === nation.id;

            return (
              <motion.button
                key={nation.id}
                whileHover={!isSelected ? { scale: 1.02 } : {}}
                whileTap={!isSelected ? { scale: 0.98 } : {}}
                onClick={() => handleSelectNation(nation.id)}
                disabled={isSelected}
                className={clsx(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-slate-600 bg-slate-800 opacity-50 cursor-not-allowed'
                    : 'border-slate-600 bg-slate-700 hover:border-amber-500 hover:bg-slate-600 cursor-pointer',
                  isCurrentSelection && 'border-amber-500 bg-amber-900/30'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{nation.flag}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{nation.name}</h3>
                    {isSelected && !isCurrentSelection && (
                      <span className="text-xs text-red-400">이미 선택됨</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-3">{nation.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {nation.bonus.tradeBonus > 0 && (
                    <div className="text-yellow-400">교역 +{nation.bonus.tradeBonus}</div>
                  )}
                  {nation.bonus.productionBonus > 0 && (
                    <div className="text-orange-400">생산 +{nation.bonus.productionBonus}</div>
                  )}
                  {nation.bonus.cultureBonus > 0 && (
                    <div className="text-purple-400">문화 +{nation.bonus.cultureBonus}</div>
                  )}
                  {nation.bonus.militaryBonus > 0 && (
                    <div className="text-red-400">군사 +{nation.bonus.militaryBonus}</div>
                  )}
                </div>
                {nation.bonus.specialAbility && (
                  <div className="mt-2 text-xs text-cyan-400 border-t border-slate-600 pt-2">
                    특수: {nation.bonus.specialAbility}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 선택 현황 */}
        <div className="mt-8 p-4 bg-slate-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">선택 현황</h3>
          <div className="flex flex-wrap gap-3">
            {players.map((player, idx) => {
              const selectedNation = selectedNations[idx];
              const nation = selectedNation ? NATIONS[selectedNation] : null;

              return (
                <div
                  key={player.id}
                  className={clsx(
                    'px-3 py-2 rounded-lg border',
                    idx === currentPlayerIndex
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-slate-600 bg-slate-700'
                  )}
                >
                  <span className="text-slate-400">{player.name}: </span>
                  {nation ? (
                    <span className="text-white">
                      {nation.flag} {nation.name}
                    </span>
                  ) : (
                    <span className="text-slate-500">선택 중...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
