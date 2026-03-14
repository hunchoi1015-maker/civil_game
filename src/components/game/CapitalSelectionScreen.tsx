// src/components/game/CapitalSelectionScreen.tsx

import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Tile, TERRAIN_PROPERTIES } from '../../types';
import { NATIONS } from '../../types/nation';
import clsx from 'clsx';

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
};

const RESOURCE_ICONS: Record<string, string> = {
  wheat: '🌾',
  iron: '⛏️',
  silk: '🧣',
  spice: '🏺',
  none: '',
};

const PLAYER_COLORS: Record<string, string> = {
  red: 'border-red-500 bg-red-500/20',
  blue: 'border-blue-500 bg-blue-500/20',
  green: 'border-green-500 bg-green-500/20',
  yellow: 'border-yellow-500 bg-yellow-500/20',
};

interface CapitalTileProps {
  tile: Tile;
  isValidSelection: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function CapitalTile({ tile, isValidSelection, isSelected, onClick }: CapitalTileProps) {
  const hasCity = tile.cityId !== null;

  // 🌟 [수정] 수도 선택 시 전장의 안개(Fog of War) 무시 - 모든 타일이 보이도록 처리
  /* if (!tile.isExplored) {
    return (
      <div className="w-10 h-10 rounded-sm bg-slate-950 flex items-center justify-center relative border border-slate-900/50">
        <span className="text-[10px] text-slate-800">?</span>
      </div>
    );
  }
  */

  return (
    <button
      onClick={onClick}
      disabled={!isValidSelection}
      className={clsx(
        'w-10 h-10 rounded-sm flex items-center justify-center text-xs transition-all relative',
        TERRAIN_COLORS[tile.terrain],
        isValidSelection && 'hover:ring-2 hover:ring-amber-400 hover:brightness-110 cursor-pointer',
        !isValidSelection && 'opacity-50 cursor-not-allowed',
        isSelected && 'ring-2 ring-white scale-110 z-10',
        tile.ownerId && 'ring-1 ring-white/50'
      )}
      title={`${TERRAIN_PROPERTIES[tile.terrain].name}${
        tile.resource !== 'none' ? ` (${RESOURCE_ICONS[tile.resource]})` : ''
      }`}
    >
      {tile.resource !== 'none' && !hasCity && (
        <span className="text-[10px]">{RESOURCE_ICONS[tile.resource]}</span>
      )}
      {hasCity && <span className="text-lg">🏛️</span>}
    </button>
  );
}

export function CapitalSelectionScreen() {
  const {
    map,
    players,
    setupState,
    selectCapitalPosition,
    startGame,
  } = useGameStore();

  const currentPlayerIndex = setupState.currentSetupPlayer;
  const currentPlayer = players[currentPlayerIndex];

  const allCapitalsPlaced = players.every(p => p.hasCapital);

  if (allCapitalsPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-amber-500 mb-4">모든 수도 배치 완료!</h2>
          <p className="text-slate-300 mb-6">게임을 시작할 준비가 되었습니다.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg"
          >
            게임 시작!
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const nation = NATIONS[currentPlayer.nation];

  const isTooCloseToCity = (x: number, y: number): boolean => {
    for (const p of players) {
      for (const city of p.cities) {
        const dx = Math.abs(city.position.x - x);
        const dy = Math.abs(city.position.y - y);
        if (Math.max(dx, dy) < 3) {
          return true;
        }
      }
    }
    return false;
  };

  const isValidTile = (tile: Tile) => {
    // 🌟 [수정] 미탐험 지역 검사 주석 처리 - 어디든 건설 가능하게 허용
    // if (!tile.isExplored) return false;
    
    if (tile.terrain === 'water' || tile.terrain === 'mountain') return false;
    if (tile.cityId !== null) return false;
    if (tile.ownerId !== null) return false;
    if (isTooCloseToCity(tile.position.x, tile.position.y)) return false;
    return true;
  };

  const handleTileClick = (x: number, y: number) => {
    const tile = map.tiles[y][x];

    // 🌟 [수정] 클릭 핸들러에서도 탐험 여부 확인 주석 처리
    // if (!tile.isExplored) return;

    if (isValidTile(tile)) {
      selectCapitalPosition(currentPlayerIndex, { x, y });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-500 mb-2">수도 위치 선택</h1>
          <p className="text-slate-400">
            수도를 건설할 위치를 선택하세요
          </p>
        </div>

        {/* 현재 플레이어 정보 */}
        <motion.div
          key={currentPlayerIndex}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={clsx(
            'mb-6 p-4 rounded-lg border-2',
            PLAYER_COLORS[currentPlayer.color]
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{currentPlayer.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{nation.flag}</span>
                <span className="text-slate-300">{nation.name}</span>
              </div>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>플레이어 {currentPlayerIndex + 1} / {players.length}</p>
              <p className="text-amber-400">{nation.description}</p>
            </div>
          </div>
        </motion.div>

        {/* 맵 */}
        <div className="bg-slate-800 rounded-lg p-4 overflow-auto">
          <div
            className="grid gap-0.5 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
              maxWidth: `${map.width * 44}px`,
            }}
          >
            {map.tiles.map((row, y) =>
              row.map((tile, x) => (
                <CapitalTile
                  key={tile.id}
                  tile={tile}
                  isValidSelection={isValidTile(tile)}
                  isSelected={false}
                  onClick={() => handleTileClick(x, y)}
                />
              ))
            )}
          </div>
        </div>

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded" />
            <span>초원</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-800 rounded" />
            <span>숲</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-600 rounded" />
            <span>사막</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-stone-500 rounded opacity-50" />
            <span>산악 (건설 불가)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded opacity-50" />
            <span>물 (건설 불가)</span>
          </div>
        </div>
      </div>
    </div>
  );
}