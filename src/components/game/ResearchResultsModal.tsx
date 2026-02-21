import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function ResearchResultsModal() {
  const {
    turnResearchResults,
    showResearchResults,
    setShowResearchResults,
    clearResearchResults,
    players,
    turn
  } = useGameStore();

  if (!showResearchResults) return null;

  const handleClose = () => {
    setShowResearchResults(false);
    clearResearchResults(); // 닫을 때 기록 비우기
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-800 border-2 border-indigo-500 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        >
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            🔬 {turn - 1}라운드 연구 결과
          </h2>
          <p className="text-slate-400 text-center mb-6">
            각 국가가 새로운 기술을 완성했습니다!
          </p>

          <div className="space-y-4 mb-8 max-h-80 overflow-y-auto pr-2">
            {turnResearchResults.map((result, idx) => {
              const player = players.find((p) => p.id === result.playerId);
              return (
                <div key={idx} className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between border border-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player?.nation === 'rome' ? '🏛️' : player?.nation === 'egypt' ? '🐪' : '🚩'}</span>
                    <div>
                      <div className="text-sm text-slate-400">{player?.name}</div>
                      <div className="font-bold text-white text-lg text-indigo-300">
                        {result.techName}
                      </div>
                    </div>
                  </div>
                  <div className="text-xl">✨</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleClose}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
          >
            확인하고 다음 턴 시작하기
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}