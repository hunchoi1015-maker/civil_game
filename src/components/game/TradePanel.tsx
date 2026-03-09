import  { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { calculateTradeIncome } from '../../engine/GameEngine';
import { motion } from 'framer-motion';

export function TradePanel() {
  const {
    currentPhase,
    currentPlayerIndex,
    players,
    map,
    collectTradeIncome,
    endPhaseForCurrentPlayer
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  // 교역 단계가 아니거나 맵이 없으면 숨김
  if (currentPhase !== 'trade' || !map) return null;

  // 예상 교역 수입 계산 (타일 + 건물 + 정치체제)
  const projectedIncome = useMemo(() => {
    return calculateTradeIncome(currentPlayer, map);
  }, [currentPlayer, map]);

  const handleCollect = () => {
    const success = collectTradeIncome(currentPlayer.id);
    if (success) {
      // 수령 후 자동으로 다음 플레이어/단계로 넘어가길 원한다면 주석 해제
      // endPhaseForCurrentPlayer(); 
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-slate-700 p-6 rounded-xl shadow-2xl backdrop-blur-md min-w-[300px]"
    >
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold text-amber-400">🐫 교역 단계</h3>
        
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-slate-300 text-sm mb-1">예상 교역 수입</div>
          <div className="text-3xl font-bold text-white">
            +{projectedIncome} <span className="text-amber-500 text-lg">Trade</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            (도시 주변 타일 + 건물 보너스)
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400 px-2">
          <span>현재 보유량:</span>
          <span className="text-white font-mono">
            {currentPlayer.resources.trade} / 27
          </span>
        </div>

        {currentPlayer.hasCollectedTrade ? (
          <div className="bg-green-900/50 text-green-300 py-2 rounded-lg font-bold border border-green-700">
            수령 완료 ✅
          </div>
        ) : (
          <button
            onClick={handleCollect}
            disabled={currentPlayer.resources.trade >= 27}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              currentPlayer.resources.trade >= 27
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:shadow-amber-500/20'
            }`}
          >
            교역품 수집하기
          </button>
        )}

        {/* 수집 완료 후 턴 넘기기 버튼 */}
        {currentPlayer.hasCollectedTrade && (
           <button
             onClick={endPhaseForCurrentPlayer}
             className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
           >
             다음 단계로 이동 &rarr;
           </button>
        )}
      </div>
    </motion.div>
  );
}