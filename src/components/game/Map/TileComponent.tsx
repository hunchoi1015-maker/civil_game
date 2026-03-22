// src/components/game/Map/TileComponent.tsx

import React, { useMemo, useEffect } from 'react';
import { Tile, TERRAIN_PROPERTIES, Unit } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import { calculateTileYield } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { BUILDINGS } from '../../../constants/buildings';
import { WONDERS } from '../../../types/wonder';
import { motion, AnimatePresence } from 'framer-motion';

interface TileComponentProps {
  tile: Tile;
  isSelected: boolean;
  onClick: () => void;
}

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
  plains: 'bg-lime-500',
};

const RESOURCE_ICONS: Record<string, string> = {
  wheat: '🌾',
  iron: '⛏️',
  silk: '🧣', 
  spice: '🏺', 
  none: '',
};

const BUILDING_ICONS: Record<string, string> = {
  walls: '🏰',
  barracks: '⛺',
  library: '📜',
  university: '🎓',
  market: '⚖️',
  bank: '🏦',
  temple: '🛐',
  cathedral: '⛪',
};

const GREAT_PERSON_ICONS: Record<string, string> = {
  artist: '🎨',
  inventor: '💡',
  general: '🎖️',
  humanitarian: '🕊️',
  explorer: '🔭',
  scientist: '🔬',
};

const PLAYER_COLORS: Record<string, string> = {
  red: 'ring-red-500',
  blue: 'ring-blue-500',
  green: 'ring-green-500',
  yellow: 'ring-yellow-500',
};

const PLAYER_BG_COLORS: Record<string, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  yellow: 'bg-yellow-500', // yellow-500은 텍스트 가독성이 비교적 괜찮습니다
};

function FloatingTextComponent({ ft, onComplete }: { ft: any, onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.5 }}
      animate={{ opacity: 1, y: -30, scale: 1.2 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={clsx("absolute z-50 font-bold drop-shadow-md text-sm pointer-events-none whitespace-nowrap", ft.color)}
    >
      {ft.text}
    </motion.div>
  );
}

export const TileComponent = React.memo(({ tile, isSelected, onClick }: TileComponentProps) => {
  const { players, selectedUnit, currentPlayerIndex, floatingTexts, removeFloatingText } = useGameStore();

  const owner = tile.ownerId ? players.find((p) => p.id === tile.ownerId) : null;
  const hasCity = tile.cityId !== null;
  const hasUnits = tile.unitIds.length > 0;
  const currentPlayer = players[currentPlayerIndex];

  const buildingType = tile.buildingType;
  const hasBuilding = !!buildingType;
  const buildingDef = buildingType ? BUILDINGS[buildingType] : null;

  const ownerRingClass = owner ? PLAYER_COLORS[owner.color] : '';
  const tileYield = calculateTileYield(tile);

  const unitsOnTile: Unit[] = [];
  for (const player of players) {
    for (const unit of player.units) {
      if (tile.unitIds.includes(unit.id)) {
        unitsOnTile.push(unit);
      }
    }
  }

  const myUnitsOnTile = unitsOnTile.filter(u => u.ownerId === currentPlayer.id);
  const hasEnemyUnits = unitsOnTile.length > myUnitsOnTile.length;

  // 🌟 [추가] 유닛의 소유자(색상) 확인
  const firstUnit = unitsOnTile.length > 0 ? unitsOnTile[0] : null;
  const unitOwner = firstUnit ? players.find(p => p.id === firstUnit.ownerId) : null;
  const unitBgColor = unitOwner ? PLAYER_BG_COLORS[unitOwner.color] : 'bg-slate-600';

  let isCityParalyzed = false;
  if (hasCity && owner) {
      const city = owner.cities.find(c => c.id === tile.cityId);
      if (city?.isParalyzed) isCityParalyzed = true;
  }
  const isParalyzed = tile.isParalyzed || isCityParalyzed;

  const selectedUnitData = selectedUnit
    ? currentPlayer.units.find(u => u.id === selectedUnit)
    : null;

  const canMoveHere = selectedUnitData &&
    selectedUnitData.movement > 0 &&
    tile.terrain !== 'water' &&
    (
      (Math.abs(tile.position.x - selectedUnitData.position.x) === 1 && tile.position.y === selectedUnitData.position.y) ||
      (Math.abs(tile.position.y - selectedUnitData.position.y) === 1 && tile.position.x === selectedUnitData.position.x)
    );

  let tooltip = `${TERRAIN_PROPERTIES[tile.terrain].name}`;
  if (hasBuilding && buildingDef) {
    tooltip += `\n건물: ${buildingDef.name} (대체됨)`;
  } else if (tile.resource !== 'none') {
    tooltip += 0;
  }
  tooltip += `\n생산: ${tileYield.production}, 교역: ${tileYield.trade}, 문화: ${tileYield.culture}`;

  if (tile.greatPerson) {
    const icon = GREAT_PERSON_ICONS[tile.greatPerson.type] || '🌟';
    tooltip += `\n위인: ${tile.greatPerson.type.toUpperCase()} ${icon}\n${tile.greatPerson.description}`;
  }

  const myFloatingTexts = useMemo(() => {
    return floatingTexts.filter(ft => ft.x === tile.position.x && ft.y === tile.position.y);
  }, [floatingTexts, tile.position.x, tile.position.y]);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full h-full aspect-square rounded-sm flex flex-col items-center justify-center transition-all relative overflow-hidden',
        TERRAIN_COLORS[tile.terrain],
        isSelected && 'ring-2 ring-white scale-110 z-10',
        owner && !isSelected && `ring-1 ${ownerRingClass}`,
        canMoveHere && 'ring-2 ring-green-400 animate-pulse',
        'hover:brightness-110'
      )}
      title={tooltip}
    >
      {/* 0. 마비 상태 표시 */}
      {isParalyzed && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-red-900/40 rounded-sm pointer-events-none">
          <span className="text-2xl drop-shadow-lg">⚡</span>
        </div>
      )}

      {/* 1. 건물 표시 */}
      {hasBuilding && buildingDef && !hasCity && !hasUnits && (
        <span className="text-[12px] mb-2 pointer-events-none">{BUILDING_ICONS[buildingType] || '🏗️'}</span>
      )}

      {/* 2. 자원 표시 */}
      {!hasBuilding && tile.resource !== 'none' && !hasCity && !hasUnits && (
        <span className="text-[10px] mb-2 pointer-events-none">{RESOURCE_ICONS[tile.resource]}</span>
      )}

      {/* 도시 표시 */}
      {hasCity && (
        <div className="flex flex-col items-center mb-1 pointer-events-none">
          <span className="text-lg leading-none">🏛️</span>
          {owner && (
            <div className={`w-3 h-1 rounded ${PLAYER_BG_COLORS[owner.color]}`} />
          )}
        </div>
      )}

      {/* 🌟 [수정] 유닛 표시 (플레이어 색상 기반 토큰 UI) */}
      {hasUnits && !hasCity && firstUnit && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <motion.div
            layoutId={firstUnit.id}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={clsx(
              "w-[55%] h-[55%] min-w-[14px] min-h-[14px] max-w-[28px] max-h-[28px] rounded-full flex flex-col items-center justify-center border border-white/70 shadow-md",
              unitBgColor
            )}
          >
            <span className="text-[clamp(8px,1vw,14px)] filter drop-shadow-md">
              {unitsOnTile.some(u => u.type === 'military') ? '⚔️' : '👷'}
            </span>
          </motion.div>
          {/* 다중 유닛 겹침 표시 뱃지 */}
          {unitsOnTile.length > 1 && (
            <span className={clsx(
              "absolute bottom-3 right-1 text-[8px] text-white font-bold rounded px-1 z-30 shadow-md border border-white/40",
              unitBgColor
            )}>
              x{unitsOnTile.length}
            </span>
          )}
        </div>
      )}

      {/* 🌟 [수정] 도시 위 유닛 수 표시 (플레이어 색상 기반) */}
      {hasCity && hasUnits && (
        <span className={clsx(
          "absolute top-0 left-0 text-[10px] rounded-full w-4 h-4 flex items-center justify-center text-white z-20 pointer-events-none font-bold border border-white/50 shadow-sm",
          unitBgColor
        )}>
          {tile.unitIds.length}
        </span>
      )}
      
      {/* 오두막/마을 렌더링 */}
      {tile.object && !tile.cityId && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-2xl filter drop-shadow-md animate-pulse">
            {tile.object.type === 'hut' ? '🛖' : '⛺'}
          </span>
        </div>
      )}

      {/* 미니 아이콘 (도시/유닛에 가려질 때) */}
      {(hasCity || hasUnits) && (
        <span className="absolute top-0 right-0 text-[8px] pointer-events-none">
          {hasBuilding
            ? (BUILDING_ICONS[buildingType!] || '🏗️')
            : (tile.resource !== 'none' ? RESOURCE_ICONS[tile.resource] : '')}
        </span>
      )}

      {/* 불가사의 */}
      {tile.wonder && tile.wonder.type && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span className="text-3xl filter drop-shadow-lg" title={WONDERS[tile.wonder.type]?.name}>
                🗽
            </span>
        </div>
      )}
      
      {/* 위인 */}
      {tile.greatPerson && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-3xl filter drop-shadow-lg animate-pulse" title="위인">
            {GREAT_PERSON_ICONS[tile.greatPerson.type] || '🌟'}
          </span>
        </div>
      )}

      {/* 적 유닛 경고 */}
      {hasEnemyUnits && (
        <span className="absolute top-0 right-0 text-[8px] animate-bounce pointer-events-none">⚠️</span>
      )}

      {/* 자원 생산량 시각화 (하단 오버레이) */}
      <div className="absolute bottom-0 w-full flex justify-center gap-0.5 bg-black/30 backdrop-blur-[1px] rounded-b-sm py-[1px] pointer-events-none">
        {tileYield.production > 0 && (
          <div className="flex items-center">
            <span className="text-[clamp(5px,0.6vw,8px)] text-orange-300 leading-none">🔨</span>
            <span className="text-[clamp(5px,0.6vw,8px)] text-white font-bold ml-[1px] leading-none">{tileYield.production}</span>
          </div>
        )}
        {tileYield.trade > 0 && (
          <div className="flex items-center">
            <span className="text-[clamp(5px,0.6vw,8px)] text-yellow-300">📦</span>
            <span className="text-[clamp(5px,0.6vw,8px)] text-white font-bold ml-[1px]">{tileYield.trade}</span>
          </div>
        )}
        {tileYield.culture > 0 && (
          <div className="flex items-center">
            <span className="text-clamp(5px,0.6vw,8px)] text-purple-300">📜</span>
            <span className="text-[clamp(5px,0.6vw,8px)] text-white font-bold ml-[1px]">{tileYield.culture}</span>
          </div>
        )}
      </div>

      {/* 플로팅 텍스트 렌더링 컨테이너 */}
      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        <AnimatePresence>
          {myFloatingTexts.map((ft) => (
            <FloatingTextComponent key={ft.id} ft={ft} onComplete={() => removeFloatingText(ft.id)} />
          ))}
        </AnimatePresence>
      </div>

    </button>
  );
});