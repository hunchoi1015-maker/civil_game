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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] backdrop-blur-md font-serif">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="panel-texture rounded-3xl p-10 max-w-lg w-full text-center border-amber-500/80 shadow-[0_0_60px_rgba(245,158,11,0.3)] relative overflow-hidden"
      >
        {/* 화려한 배경 이펙트 */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/40 to-transparent pointer-events-none" />
        
        <div className="panel-content relative z-10">
          <div className="text-7xl mb-6 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-bounce">
            {VICTORY_ICONS[winCondition]}
          </div>

          <h2 className="text-4xl font-black text-amber-400 mb-3 text-glow-gold tracking-wider">
            {winningPlayer.name} 승리!
          </h2>

          <div className="text-2xl text-amber-100 font-bold mb-4 border-b border-amber-700/50 pb-4 inline-block px-8">
            {getWinConditionName(winCondition)}
          </div>

          <p className="text-amber-200/80 mb-10 leading-relaxed text-sm">
            {getWinConditionDescription(winCondition)}
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleNewGame}
              className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-amber-950 font-black rounded-xl shadow-glow-gold border border-yellow-300 transition-all transform hover:scale-[1.02] text-lg"
            >
              다시 하기
            </button>
            <button
              onClick={handleMainMenu}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-600 shadow-inner transition-colors text-lg"
            >
              메인 메뉴
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}