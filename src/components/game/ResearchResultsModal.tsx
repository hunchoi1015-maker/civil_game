import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

const PLAYER_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
};

export function ResearchResultsModal() {
  const {
    turnResearchResults,
    showResearchResults,
    setShowResearchResults,
    clearResearchResults,
    endTurn,
    players,
    turn,
  } = useGameStore();

  if (!showResearchResults) return null;

  const handleConfirm = () => {
    setShowResearchResults(false);
    clearResearchResults();
    endTurn();
  };

  // 플레이어 색상 가져오기
  const getPlayerColor = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? PLAYER_COLORS[player.color] : 'bg-slate-500';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 rounded-lg p-8 w-[600px] max-h-[80vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-500 mb-2">
            턴 {turn} 연구 결과
          </h2>
          <p className="text-slate-400">
            이번 턴에 각 플레이어가 연구한 기술입니다.
          </p>
        </div>

        <div className="space-y-4">
          {turnResearchResults.map((result) => (
            <motion.div
              key={result.playerId}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: turnResearchResults.indexOf(result) * 0.1 }}
              className="bg-slate-700 rounded-lg p-4 flex items-center gap-4"
            >
              {/* 플레이어 색상 */}
              <div className={`w-12 h-12 rounded-full ${getPlayerColor(result.playerId)} flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">
                  {result.playerName.charAt(0)}
                </span>
              </div>

              {/* 플레이어 이름 */}
              <div className="flex-1">
                <div className="text-white font-semibold">{result.playerName}</div>
                {result.techId ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-green-400">연구 완료:</span>
                    <span className="text-amber-400 font-medium">{result.techName}</span>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm mt-1">
                    이번 턴에 연구하지 않음
                  </div>
                )}
              </div>

              {/* 아이콘 */}
              <div className="text-3xl">
                {result.techId ? '🔬' : '💤'}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
          >
            다음 턴으로 →
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
