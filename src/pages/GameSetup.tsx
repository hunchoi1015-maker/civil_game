// src/pages/GameSetup.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CapitalSelectionScreen } from '../components/game/CapitalSelectionScreen';
import { InitialDeploymentScreen } from '../components/game/InitialDeploymentScreen';
import { NationSelectionScreen } from '../components/game/NationSelectionScreen'; // 🌟 추가!
import { useGameStore } from '../store/gameStore';

const PLAYER_COLORS = [
  { id: 'red', name: '빨강', bg: 'bg-red-500' },
  { id: 'blue', name: '파랑', bg: 'bg-blue-500' },
  { id: 'green', name: '초록', bg: 'bg-green-500' },
  { id: 'yellow', name: '노랑', bg: 'bg-yellow-500' },
];

export function GameSetup() {
  const navigate = useNavigate();
  // 🌟 이전의 initGame 대신 initSetup과 setupState를 가져옵니다.
  const { initSetup, setupState } = useGameStore();

  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4']);
  const [isStarted, setIsStarted] = useState(false); // 🌟 설정 화면과 게임 준비 화면 분리용 상태

  const handleStartSetup = () => {
    // 🌟 initSetup을 호출하여 맵을 생성하고 국가/수도 선택 페이즈로 진입합니다.
    initSetup(playerCount, playerNames.slice(0, playerCount));
    setIsStarted(true);
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  // 🌟 [핵심 변경점] isStarted가 true이면 setupState.phase에 따라 다른 스크린을 렌더링!
  if (isStarted) {
    if (setupState.phase === 'nationSelect') return <NationSelectionScreen />;
    if (setupState.phase === 'capitalSelect') return <CapitalSelectionScreen />;
    if (setupState.phase === 'initialUnitSelect' || setupState.phase === 'ready') return <InitialDeploymentScreen />;
    return null;
  }

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

        {/* 시작 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartSetup}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white text-xl font-semibold rounded-lg shadow-lg transition-colors"
        >
          다음: 국가 선택
        </motion.button>
      </motion.div>
    </div>
  );
}