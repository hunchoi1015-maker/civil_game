// src/components/game/InitialDeploymentScreen.tsx

import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Tile, TERRAIN_PROPERTIES, Position } from '../../types';
import { NATIONS } from '../../types/nation';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { WONDERS } from '../../types/wonder';

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
};

export function InitialDeploymentScreen() {
    
    const navigate = useNavigate();

  const {
    map,
    players,
    setupState,
    placeInitialUnit,
    placeInitialWonder,
    startGame,
  } = useGameStore();

  const currentPlayerIndex = setupState.currentSetupPlayer;
  const currentPlayer = players[currentPlayerIndex];
  
  // 현재 배치해야 할 유닛 파악
  const queue = setupState.pendingInitialUnits?.[currentPlayer.id] || [];
  const unitToPlace = queue[0]; // 큐의 맨 앞 유닛

  const wonderToPlaceId = setupState.pendingInitialWonders?.[currentPlayer.id];
  const isWonderMode = queue.length === 0 && !!wonderToPlaceId;
  const wonderDef = wonderToPlaceId ? WONDERS[wonderToPlaceId as keyof typeof WONDERS] : null;

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
            onClick={() => {
              startGame();
              navigate('/game');
            }}
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
      if (tile.terrain === 'water') return false;
      
      // 불가사의 배치 모드일 경우의 타일 규칙
      if (isWonderMode) {
          const isCenter = capital.position.x === x && capital.position.y === y;
          if (isCenter) return false; // 수도 중앙에는 건설 불가!
          
          return true; // 🌟 건물이 있거나 불가사의가 있어도 덮어쓰기가 가능하므로 true 반환
      }
      
      // 유닛 배치 모드일 경우: 패시브를 반영한 스태킹 제한 검사
      const stackingLimit = 2 + (currentPlayer.stackingLimitBonus || 0); 
      const myUnitsCount = tile.unitIds.filter(id => currentPlayer.units.some(u => u.id === id)).length;
      if (myUnitsCount >= stackingLimit) return false;

      return true;
  };

  const handleTileClick = (x: number, y: number) => {
      if (isValidDeploymentTile(x, y)) {
          if (isWonderMode) {
              placeInitialWonder(currentPlayerIndex, { x, y }); // 🌟 불가사의 배치
          } else {
              placeInitialUnit(currentPlayerIndex, { x, y });   // 🌟 유닛 배치
          }
      }
  };

  const nation = NATIONS[currentPlayer.nation];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {/* 헤더 안내 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">초기 건국 준비</h1>
          <p className="text-slate-300">
            {isWonderMode ? '이집트의 고대 불가사의를 건설할 장소를 선택하세요!' : '각 국가가 돌아가면서 수도 주변 9칸에 시작 유닛을 배치합니다.'}
          </p>
        </div>

        <div className="flex gap-8 flex-1">
            {/* 좌측 패널 */}
            <div className="w-80 bg-slate-800 rounded-xl p-6 border-2 border-blue-500/50 h-max">
                <h2 className="text-xl font-bold text-white mb-2">{currentPlayer.name} 님의 차례</h2>
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                    <span className="text-3xl">{nation.flag}</span>
                    <span className="text-lg text-slate-300">{nation.name}</span>
                </div>
                
                <div className="mb-6">
                    <p className="text-slate-400 text-sm mb-2">{isWonderMode ? '배치할 특수 구조물:' : '배치할 유닛:'}</p>
                    
                    {/* 🌟 유닛 렌더링 또는 불가사의 렌더링 분기 */}
                    {isWonderMode && wonderDef ? (
                         <div className="p-4 bg-indigo-900/60 rounded-lg flex flex-col gap-2 border border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🗽</span>
                                <span className="text-white font-bold text-lg">{wonderDef.name}</span>
                            </div>
                            <span className="text-xs text-indigo-200">고대 불가사의 (무료 건설)</span>
                        </div>
                    ) : unitToPlace ? (
                        <div className="p-4 bg-slate-700 rounded-lg flex items-center gap-3 border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
                            <span className="text-3xl">{unitToPlace === 'military' ? '⚔️' : '👷'}</span>
                            <span className="text-white font-bold text-lg">{unitToPlace === 'military' ? '군사 (보병)' : '개척자'}</span>
                        </div>
                    ) : null}
                </div>

                {!isWonderMode && (
                    <div>
                        <p className="text-slate-400 text-sm mb-2">남은 대기열:</p>
                        <div className="flex flex-wrap gap-2">
                            {queue.slice(1).map((u, idx) => (
                                <div key={idx} className="px-3 py-1 bg-slate-700 rounded text-slate-400 text-sm opacity-60">
                                    {u === 'military' ? '⚔️ 군사' : '👷 개척자'}
                                </div>
                            ))}
                            {queue.length <= 1 && <span className="text-slate-500 text-sm">없음</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* 우측 패널 (미니맵) 은 기존 코드와 거의 동일하나 🌟 부분만 추가/수정 */}
            <div className="flex-1 bg-slate-950 rounded-xl p-6 overflow-auto flex items-center justify-center border border-slate-800 relative">
                <div className="absolute top-4 left-4 z-50 text-sm text-amber-100 bg-black/80 p-3 rounded-lg shadow-lg border border-slate-700">
                    💡 밝게 빛나는 도시 주변 9칸 중 원하는 타일을 클릭하세요.
                </div>
                <div className="grid gap-1 shadow-2xl" style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}>
                    {map.tiles.map((row, y) =>
                        row.map((tile, x) => {
                            if (!tile.isExplored) {
                                return <div key={tile.id} className="w-12 h-12 rounded-sm bg-black flex items-center justify-center relative shadow-sm"><span className="text-gray-800 text-[10px]">?</span></div>;
                            }

                            const isDeploymentZone = isValidDeploymentTile(x, y);
                            const isCenter = capital.position.x === x && capital.position.y === y;
                            
                            const myMilitaryCount = tile.unitIds.filter(id => currentPlayer.units.find(u => u.id === id)?.type === 'military').length;
                            const mySettlerCount = tile.unitIds.filter(id => currentPlayer.units.find(u => u.id === id)?.type === 'settler').length;

                            return (
                                <button
                                    key={tile.id}
                                    onClick={() => handleTileClick(x, y)}
                                    disabled={!isDeploymentZone}
                                    className={clsx(
                                        'w-12 h-12 rounded-sm flex flex-col items-center justify-center text-xs transition-all relative',
                                        TERRAIN_COLORS[tile.terrain],
                                        isDeploymentZone ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:z-10 shadow-[0_0_10px_rgba(255,255,255,0.2)] brightness-110' : 'opacity-30 cursor-not-allowed',
                                        isCenter && 'ring-2 ring-blue-500'
                                    )}
                                >
                                    {isCenter && <span className="absolute -top-3 text-lg z-20">👑</span>}
                                    
                                    {/* 🌟 이미 건설된 불가사의가 있다면 표시 */}
                                    {tile.wonder && <span className="absolute text-xl z-10 opacity-70">🗽</span>}

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