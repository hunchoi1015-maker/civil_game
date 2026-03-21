// src/components/game/Map/TileComponent.tsx

import React, { useMemo, useEffect } from 'react'; // useEffect 추가
import { Tile, TERRAIN_PROPERTIES, Unit } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import { calculateTileYield } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { BUILDINGS } from '../../../constants/buildings';
import { WONDERS } from '../../../types/wonder';
import { motion, AnimatePresence } from 'framer-motion'; // 🌟 framer-motion 추가

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
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
};

// 🌟 [추가] 플로팅 텍스트 애니메이션 컴포넌트
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
  
  // 🌟 [수정] floatingTexts와 removeFloatingText 스토어에서 가져오기
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

  // 🌟 [추가] 현재 타일에 띄울 플로팅 텍스트 필터링
  const myFloatingTexts = useMemo(() => {
    return floatingTexts.filter(ft => ft.x === tile.position.x && ft.y === tile.position.y);
  }, [floatingTexts, tile.position.x, tile.position.y]);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-12 h-12 rounded-sm flex flex-col items-center justify-center text-xs transition-all relative',
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

      {/* 🌟 [수정] 유닛 표시 (Framer Motion 레이아웃 애니메이션 적용!) */}
      {hasUnits && !hasCity && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          {/* 배열의 맨 첫 번째 유닛 하나만 대표로 렌더링하면서 애니메이션 적용 */}
          <motion.div
            layoutId={unitsOnTile[0].id} // 고유 ID로 스르륵 이동 추적
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center"
          >
            <span className="text-base filter drop-shadow-md">
              {unitsOnTile.some(u => u.type === 'military') ? '⚔️' : '👷'}
            </span>
          </motion.div>
          {/* 유닛이 여러 마리일 경우 겹침 표시 (애니메이션과 분리하여 안전하게 렌더링) */}
          {unitsOnTile.length > 1 && (
            <span className="absolute bottom-3 right-1 text-[8px] text-white bg-black/70 rounded px-1 z-30">
              x{unitsOnTile.length}
            </span>
          )}
        </div>
      )}

      {/* 도시 위 유닛 수 표시 */}
      {hasCity && hasUnits && (
        <span className="absolute top-0 left-0 text-[10px] bg-black/70 rounded-full w-4 h-4 flex items-center justify-center text-white z-20 pointer-events-none">
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
            <span className="text-[6px] text-orange-300">🔨</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.production}</span>
          </div>
        )}
        {tileYield.trade > 0 && (
          <div className="flex items-center">
            <span className="text-[6px] text-yellow-300">📦</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.trade}</span>
          </div>
        )}
        {tileYield.culture > 0 && (
          <div className="flex items-center">
            <span className="text-[6px] text-purple-300">📜</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.culture}</span>
          </div>
        )}
      </div>

      {/* 🌟 [추가] 플로팅 텍스트 렌더링 컨테이너 */}
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