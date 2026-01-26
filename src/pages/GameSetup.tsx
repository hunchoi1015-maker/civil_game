import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { GameConfig } from '../types';

const PLAYER_COLORS = [
  { id: 'red', name: '빨강', bg: 'bg-red-500' },
  { id: 'blue', name: '파랑', bg: 'bg-blue-500' },
  { id: 'green', name: '초록', bg: 'bg-green-500' },
  { id: 'yellow', name: '노랑', bg: 'bg-yellow-500' },
];

const MAP_SIZES = [
  { id: 'small', name: '소형', description: '10x10 (빠른 게임)' },
  { id: 'medium', name: '중형', description: '14x14 (표준 게임)' },
  { id: 'large', name: '대형', description: '18x18 (긴 게임)' },
];

export function GameSetup() {
  const navigate = useNavigate();
  const initGame = useGameStore((state) => state.initGame);

  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4']);
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium');

  const handleStartGame = () => {
    const config: GameConfig = {
      playerCount,
      mapSize,
      playerNames: playerNames.slice(0, playerCount),
    };

    initGame(config);
    navigate('/game');
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white mb-8 flex items-center gap-2"
        >
          ← 메인 메뉴로
        </button>

        <h1 className="text-4xl font-bold text-amber-500 mb-8">게임 설정</h1>

        {/* 플레이어 수 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">플레이어 수</h2>
          <div className="flex gap-4">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  playerCount === count
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {count}인
              </button>
            ))}
          </div>
        </section>

        {/* 플레이어 이름 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">플레이어 설정</h2>
          <div className="space-y-4">
            {Array.from({ length: playerCount }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full ${PLAYER_COLORS[index].bg}`} />
                <input
                  type="text"
                  value={playerNames[index]}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                  placeholder={`플레이어 ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 맵 크기 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">맵 크기</h2>
          <div className="grid grid-cols-3 gap-4">
            {MAP_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setMapSize(size.id as 'small' | 'medium' | 'large')}
                className={`p-4 rounded-lg text-left transition-colors ${
                  mapSize === size.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="font-semibold">{size.name}</div>
                <div className="text-sm opacity-75">{size.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* 시작 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartGame}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white text-xl font-semibold rounded-lg shadow-lg transition-colors"
        >
          게임 시작
        </motion.button>
      </motion.div>
    </div>
  );
}
