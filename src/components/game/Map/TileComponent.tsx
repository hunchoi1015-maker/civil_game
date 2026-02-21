import { Tile, TERRAIN_PROPERTIES, Unit } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import { calculateTileYield } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { BUILDINGS } from '../../../constants/buildings'; // 건물 정보 가져오기
import { WONDERS } from '../../../types/wonder';

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
  silk: '🧣', // 🧵 -> 🧣 (CityPanel과 통일)
  spice: '🏺', // 🌶️ -> 🏺 (CityPanel과 통일)
  none: '',
};

// [추가] 건물 아이콘 매핑
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

export function TileComponent({ tile, isSelected, onClick }: TileComponentProps) {
  if (!tile.isExplored) {
    return (
      <div className="w-12 h-12 rounded-sm bg-black flex items-center justify-center relative">
        {/* 미탐험 지역임을 나타내는 아이콘이나 패턴을 넣을 수도 있음 */}
        <span className="text-gray-800 text-[10px]">?</span>
      </div>
    );
  }
  
  const { players, selectedUnit, currentPlayerIndex } = useGameStore();

  const owner = tile.ownerId ? players.find((p) => p.id === tile.ownerId) : null;
  const hasCity = tile.cityId !== null;
  const hasUnits = tile.unitIds.length > 0;
  const currentPlayer = players[currentPlayerIndex];

  // [추가] 건물 정보 확인
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

  // 상하좌우 4방향만 이동 가능 (대각선 불가)
  const canMoveHere = selectedUnitData &&
    selectedUnitData.movement > 0 &&
    tile.terrain !== 'water' &&
    (
      (Math.abs(tile.position.x - selectedUnitData.position.x) === 1 && tile.position.y === selectedUnitData.position.y) ||
      (Math.abs(tile.position.y - selectedUnitData.position.y) === 1 && tile.position.x === selectedUnitData.position.x)
    );

  // 툴팁 텍스트 구성
  let tooltip = `${TERRAIN_PROPERTIES[tile.terrain].name}`;
  if (hasBuilding && buildingDef) {
    tooltip += `\n건물: ${buildingDef.name} (대체됨)`;
  } else if (tile.resource !== 'none') {
    tooltip += 0;
  }
  tooltip += `\n생산: ${tileYield.production}, 교역: ${tileYield.trade}, 문화: ${tileYield.culture}`;


  
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
      {/* 0. 마비 상태 표시 (최우선) */}
      {isParalyzed && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-red-900/40 rounded-sm">
          <span className="text-2xl drop-shadow-lg">⛓️</span>
        </div>
      )}

      {/* 1. 건물 표시 (차선) */}
      {hasBuilding && buildingDef && !hasCity && !hasUnits && (
        <span className="text-[12px] mb-2">{BUILDING_ICONS[buildingType] || '🏗️'}</span>
      )}

      {/* 2. 자원 표시 (건물이 없을 때만) */}
      {!hasBuilding && tile.resource !== 'none' && !hasCity && !hasUnits && (
        <span className="text-[10px] mb-2">{RESOURCE_ICONS[tile.resource]}</span>
      )}

      {/* 도시 표시 */}
      {hasCity && (
        <div className="flex flex-col items-center mb-1">
          <span className="text-lg leading-none">🏛️</span>
          {owner && (
            <div className={`w-3 h-1 rounded ${PLAYER_BG_COLORS[owner.color]}`} />
          )}
        </div>
      )}

      {/* 유닛 표시 */}
      {hasUnits && !hasCity && (
        <div className="flex flex-col items-center mb-1">
          <span className="text-base">
            {unitsOnTile.some(u => u.type === 'military') ? '⚔️' : '👷'}
          </span>
          {unitsOnTile.length > 1 && (
            <span className="text-[8px] text-white bg-black/50 rounded px-1">
              x{unitsOnTile.length}
            </span>
          )}
        </div>
      )}

      {/* 도시 위 유닛 수 표시 */}
      {hasCity && hasUnits && (
        <span className="absolute top-0 left-0 text-[10px] bg-black/70 rounded-full w-4 h-4 flex items-center justify-center text-white z-20">
          {tile.unitIds.length}
        </span>
      )}
      
      {/* [추가] 오두막/마을 렌더링 */}
      {tile.object && !tile.cityId && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-2xl filter drop-shadow-md animate-pulse">
            {tile.object.type === 'hut' ? '🛖' : '⛺'}
          </span>
        </div>
      )}

      {/* [수정] 건물/자원 미니 아이콘 (도시/유닛에 가려질 때) */}
      {/* 건물이 있으면 건물 아이콘, 없으면 자원 아이콘 */}
      {(hasCity || hasUnits) && (
        <span className="absolute top-0 right-0 text-[8px]">
          {hasBuilding
            ? (BUILDING_ICONS[buildingType!] || '🏗️')
            : (tile.resource !== 'none' ? RESOURCE_ICONS[tile.resource] : '')}
        </span>
      )}

      {tile.wonder && (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <span className="text-3xl filter drop-shadow-lg" title={WONDERS[tile.wonder.type].name}>
            🗽
        </span>
    </div>
    )}

      {/* 적 유닛 경고 */}
      {hasEnemyUnits && (
        <span className="absolute top-0 right-0 text-[8px] animate-bounce">⚠️</span>
      )}

      {/* 자원 생산량 시각화 (하단 오버레이) */}
      <div className="absolute bottom-0 w-full flex justify-center gap-0.5 bg-black/30 backdrop-blur-[1px] rounded-b-sm py-[1px]">
        {tileYield.production > 0 && (
          <div className="flex items-center">
            <span className="text-[6px] text-orange-300">⚙️</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.production}</span>
          </div>
        )}
        {tileYield.trade > 0 && (
          <div className="flex items-center">
            <span className="text-[6px] text-yellow-300">💰</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.trade}</span>
          </div>
        )}
        {tileYield.culture > 0 && (
          <div className="flex items-center">
            <span className="text-[6px] text-purple-300">🎵</span>
            <span className="text-[6px] text-white font-bold ml-[1px]">{tileYield.culture}</span>
          </div>
        )}
      </div>
    </button>
  );
}