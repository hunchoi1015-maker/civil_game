import { motion } from 'framer-motion';
import { PlayerColor } from '../../types';

interface PlayerTransitionProps {
  playerName: string;
  playerColor: PlayerColor;
  onReady: () => void;
}

const COLOR_STYLES: Record<PlayerColor, { bg: string; text: string }> = {
  red: { bg: 'bg-red-600', text: 'text-red-400' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-400' },
  green: { bg: 'bg-green-600', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-600', text: 'text-yellow-400' },
};

export function PlayerTransition({ playerName, playerColor, onReady }: PlayerTransitionProps) {
  const colors = COLOR_STYLES[playerColor];

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className={`w-24 h-24 ${colors.bg} rounded-full mx-auto mb-6`} />

        <h1 className={`text-4xl font-bold ${colors.text} mb-4`}>
          {playerName}의 차례
        </h1>

        <p className="text-slate-400 text-lg mb-8">
          다른 플레이어는 화면을 보지 마세요!
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReady}
          className={`px-8 py-4 ${colors.bg} hover:brightness-110 text-white text-xl font-semibold rounded-lg shadow-lg transition-all`}
        >
          준비 완료
        </motion.button>

        <p className="text-slate-500 text-sm mt-8">
          핫시트 모드: 같은 기기에서 번갈아가며 플레이합니다
        </p>
      </motion.div>
    </div>
  );
}
