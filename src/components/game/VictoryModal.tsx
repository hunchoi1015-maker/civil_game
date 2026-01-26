import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getWinConditionName, getWinConditionDescription } from '../../engine/GameEngine';

const VICTORY_ICONS: Record<string, string> = {
  science: '🚀',
  culture: '🎭',
  military: '⚔️',
  economic: '💰',
};

export function VictoryModal() {
  const navigate = useNavigate();
  const { winner, winCondition, players, resetGame } = useGameStore();

  const winningPlayer = players.find((p) => p.id === winner);

  if (!winningPlayer || !winCondition) return null;

  const handleNewGame = () => {
    resetGame();
    navigate('/setup');
  };

  const handleMainMenu = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 rounded-2xl p-8 max-w-md text-center"
      >
        <div className="text-6xl mb-4">{VICTORY_ICONS[winCondition]}</div>

        <h2 className="text-3xl font-bold text-amber-500 mb-2">
          {winningPlayer.name} 승리!
        </h2>

        <div className="text-xl text-white mb-2">
          {getWinConditionName(winCondition)}
        </div>

        <p className="text-slate-400 mb-8">
          {getWinConditionDescription(winCondition)}
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleNewGame}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-colors"
          >
            새 게임
          </button>
          <button
            onClick={handleMainMenu}
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
          >
            메인 메뉴
          </button>
        </div>
      </motion.div>
    </div>
  );
}
