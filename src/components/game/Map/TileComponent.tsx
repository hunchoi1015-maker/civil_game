import { Tile, TERRAIN_PROPERTIES, RESOURCE_PROPERTIES, Unit } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import clsx from 'clsx';

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
  gold: '💰',
  silk: '🧵',
  incense: '🪔',
  spice: '🌶️',
  none: '',
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
  const { players, selectedUnit, currentPlayerIndex } = useGameStore();

  const owner = tile.ownerId ? players.find((p) => p.id === tile.ownerId) : null;
  const hasCity = tile.cityId !== null;
  const hasUnits = tile.unitIds.length > 0;
  const currentPlayer = players[currentPlayerIndex];

  const ownerRingClass = owner ? PLAYER_COLORS[owner.color] : '';

  // 타일 위의 유닛 정보 가져오기
  const unitsOnTile: Unit[] = [];
  for (const player of players) {
    for (const unit of player.units) {
      if (tile.unitIds.includes(unit.id)) {
        unitsOnTile.push(unit);
      }
    }
  }

  // 현재 플레이어의 유닛인지 확인
  const myUnitsOnTile = unitsOnTile.filter(u => u.ownerId === currentPlayer.id);
  const hasEnemyUnits = unitsOnTile.length > myUnitsOnTile.length;

  // 선택된 유닛이 있고, 이 타일로 이동 가능한지 확인
  const selectedUnitData = selectedUnit
    ? currentPlayer.units.find(u => u.id === selectedUnit)
    : null;

  const canMoveHere = selectedUnitData && !selectedUnitData.hasMoved &&
    selectedUnitData.movement > 0 &&
    tile.terrain !== 'water' &&
    Math.abs(tile.position.x - selectedUnitData.position.x) <= 1 &&
    Math.abs(tile.position.y - selectedUnitData.position.y) <= 1 &&
    !(tile.position.x === selectedUnitData.position.x && tile.position.y === selectedUnitData.position.y);

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
      title={`${TERRAIN_PROPERTIES[tile.terrain].name}${
        tile.resource !== 'none' ? ` - ${RESOURCE_PROPERTIES[tile.resource].name}` : ''
      }`}
    >
      {/* 자원 표시 */}
      {tile.resource !== 'none' && !hasCity && !hasUnits && (
        <span className="text-[10px]">{RESOURCE_ICONS[tile.resource]}</span>
      )}

      {/* 도시 표시 */}
      {hasCity && (
        <div className="flex flex-col items-center">
          <span className="text-lg leading-none">🏛️</span>
          {owner && (
            <div className={`w-3 h-1 rounded ${PLAYER_BG_COLORS[owner.color]}`} />
          )}
        </div>
      )}

      {/* 유닛 표시 */}
      {hasUnits && !hasCity && (
        <div className="flex flex-col items-center">
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
        <span className="absolute bottom-0 right-0 text-[10px] bg-black/70 rounded-full w-4 h-4 flex items-center justify-center text-white">
          {tile.unitIds.length}
        </span>
      )}

      {/* 자원 표시 (도시 아래) */}
      {tile.resource !== 'none' && hasCity && (
        <span className="absolute top-0 right-0 text-[8px]">{RESOURCE_ICONS[tile.resource]}</span>
      )}

      {/* 적 유닛 표시 */}
      {hasEnemyUnits && (
        <span className="absolute top-0 right-0 text-[8px]">⚠️</span>
      )}
    </button>
  );
}
