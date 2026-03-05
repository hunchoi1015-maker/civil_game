// src/components/game/InitialDeploymentScreen.tsx

import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Tile, TERRAIN_PROPERTIES, Position } from '../../types';
import { NATIONS } from '../../types/nation';
import clsx from 'clsx';

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
};

export function InitialDeploymentScreen() {
  const {
    map,
    players,
    setupState,
    placeInitialUnit,
    startGame,
  } = useGameStore();

  const currentPlayerIndex = setupState.currentSetupPlayer;
  const currentPlayer = players[currentPlayerIndex];
  
  // 현재 배치해야 할 유닛 파악
  const queue = setupState.pendingInitialUnits?.[currentPlayer.id] || [];
  const unitToPlace = queue[0]; // 큐의 맨 앞 유닛

  if (setupState.phase === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-amber-500 mb-4">초기 병력 배치 완료!</h2>
          <p className="text-slate-300 mb-6">모든 문명의 건국 준비가 끝났습니다.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xl shadow-lg shadow-amber-900/50"
          >
            본 게임 시작하기 🚀
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const capital = currentPlayer.cities.find(c => c.isCapital);
  if (!capital) return null; // 에러 방지

  const isValidDeploymentTile = (x: number, y: number): boolean => {
      const dx = Math.abs(capital.position.x - x);
      const dy = Math.abs(capital.position.y - y);
      
      // 수도 중심 9칸(1칸 거리) 이내인지 검사
      if (dx > 1 || dy > 1) return false;
      
      const tile = map.tiles[y][x];
      // 물, 산 배치 불가
      if (tile.terrain === 'water' || tile.terrain === 'mountain') return false;
      
      // 배치 한도(Stacking Limit) 검사
      const stackingLimit = 2; // 초반엔 패시브 없으므로 기본 2개 고정
      const myUnitsCount = tile.unitIds.filter(id => currentPlayer.units.some(u => u.id === id)).length;
      if (myUnitsCount >= stackingLimit) return false;

      return true;
  };

  const handleTileClick = (x: number, y: number) => {
      if (isValidDeploymentTile(x, y)) {
          placeInitialUnit(currentPlayerIndex, { x, y });
      }
  };

  const nation = NATIONS[currentPlayer.nation];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {/* 헤더 안내 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">초기 유닛 배치</h1>
          <p className="text-slate-300">
            각 국가가 돌아가면서 수도 주변 9칸에 시작 유닛을 배치합니다.
          </p>
        </div>

        <div className="flex gap-8 flex-1">
            {/* 좌측 패널: 현재 플레이어 지시사항 */}
            <div className="w-80 bg-slate-800 rounded-xl p-6 border-2 border-blue-500/50 h-max">
                <h2 className="text-xl font-bold text-white mb-2">{currentPlayer.name} 님의 차례</h2>
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                    <span className="text-3xl">{nation.flag}</span>
                    <span className="text-lg text-slate-300">{nation.name}</span>
                </div>
                
                <div className="mb-6">
                    <p className="text-slate-400 text-sm mb-2">배치할 유닛:</p>
                    {unitToPlace && (
                        <div className="p-4 bg-slate-700 rounded-lg flex items-center gap-3 border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
                            <span className="text-3xl">{unitToPlace === 'military' ? '⚔️' : '👷'}</span>
                            <span className="text-white font-bold text-lg">{unitToPlace === 'military' ? '군사 (보병)' : '개척자'}</span>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-slate-400 text-sm mb-2">남은 대기열:</p>
                    <div className="flex flex-wrap gap-2">
                        {queue.slice(1).map((u, idx) => (
                            <div key={idx} className="px-3 py-1 bg-slate-700 rounded text-slate-400 text-sm opacity-60">
                                {u === 'military' ? '⚔️ 군사' : '👷 개척자'}
                            </div>
                        ))}
                        {queue.length === 1 && <span className="text-slate-500 text-sm">없음</span>}
                    </div>
                </div>
            </div>

            {/* 우측 패널: 미니맵 */}
            <div className="flex-1 bg-slate-950 rounded-xl p-6 overflow-auto flex items-center justify-center border border-slate-800 relative">
                <div className="absolute top-4 left-4 text-sm text-slate-400 bg-black/50 p-2 rounded">
                    💡 밝게 빛나는 9칸 중 원하는 타일을 클릭하세요.
                </div>
                <div 
                    className="grid gap-1 shadow-2xl"
                    style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}
                >
                    {map.tiles.map((row, y) =>
                        row.map((tile, x) => {
                            const isDeploymentZone = isValidDeploymentTile(x, y);
                            const isCenter = capital.position.x === x && capital.position.y === y;
                            
                            // 타일에 내 유닛 렌더링
                            const myMilitaryCount = tile.unitIds.filter(id => currentPlayer.units.find(u => u.id === id)?.type === 'military').length;
                            const mySettlerCount = tile.unitIds.filter(id => currentPlayer.units.find(u => u.id === id)?.type === 'settler').length;

                            return (
                                <button
                                    key={tile.id}
                                    onClick={() => handleTileClick(x, y)}
                                    disabled={!isDeploymentZone}
                                    className={clsx(
                                        'w-12 h-12 rounded-sm flex items-center justify-center text-xs transition-all relative',
                                        TERRAIN_COLORS[tile.terrain],
                                        !tile.isExplored ? 'bg-black opacity-10' : '',
                                        isDeploymentZone 
                                            ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:z-10 shadow-[0_0_10px_rgba(255,255,255,0.2)] brightness-110' 
                                            : 'opacity-30 cursor-not-allowed',
                                        isCenter && 'ring-2 ring-blue-500'
                                    )}
                                >
                                    {isCenter && <span className="absolute -top-3 text-lg z-20">👑</span>}
                                    
                                    {/* 유닛 아이콘 표시 */}
                                    <div className="flex gap-1 z-10">
                                        {Array(myMilitaryCount).fill(0).map((_, i) => <span key={`m-${i}`}>⚔️</span>)}
                                        {Array(mySettlerCount).fill(0).map((_, i) => <span key={`s-${i}`}>👷</span>)}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}