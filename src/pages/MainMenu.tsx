import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold text-amber-500 mb-4">문명</h1>
        <p className="text-xl text-slate-400 mb-12">턴제 전략 보드게임</p>

        <div className="flex flex-col gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/setup')}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white text-xl font-semibold rounded-lg shadow-lg transition-colors"
          >
            새 게임
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {}}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xl font-semibold rounded-lg shadow-lg transition-colors"
            disabled
          >
            이어하기 (준비중)
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/rules')}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xl font-semibold rounded-lg shadow-lg transition-colors"
          >
            게임 규칙
          </motion.button>
        </div>

        <div className="mt-12 text-slate-500 text-sm">
          <p>2-4인 핫시트 멀티플레이어</p>
          <p className="mt-1">React + TypeScript + Zustand</p>
        </div>
      </motion.div>
    </div>
  );
}
