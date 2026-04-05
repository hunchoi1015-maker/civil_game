// src/components/game/Map/TileComponent.tsx

import React, { useMemo, useEffect } from 'react';
import { Tile, TERRAIN_PROPERTIES, Unit } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import { calculateTileYield } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { BUILDINGS } from '../../../constants/buildings';
import { WONDERS } from '../../../types/wonder';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidGreatPersonTile } from '../../../store/helpers/validationHelpers';

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

 const WONDER_ICONS: Record<string, string> = {
  pyramids: '🔺',             // 피라미드
  colossus: '🗿',             // 거신상
  hanging_gardens: '⛲',      // 공중정원
  stonehenge: '🪨',           // 스톤헨지
  oracle: '🏛️',             // 신탁
  louvre: '🖼️',             // 루브르 박물관
  himeji_castle: '🏯',        // 히메지성
  porcelain_tower: '🏺',      // 자기탑 (도자기)
  angkor_wat: '🛕',           // 앙코르와트
  un: '🌐',                   // 국제연합
  statue_of_liberty: '🗽',    // 자유의 여신상
  sydney_opera_house: '🎭',   // 시드니 오페라 하우스
  panama_canal: '🚢',         // 파나마 운하
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
  yellow: 'bg-yellow-500',
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
  const { players, selectedUnit, currentPlayerIndex, floatingTexts, removeFloatingText, targetingMode, map } = useGameStore();

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

  const firstUnit = unitsOnTile.length > 0 ? unitsOnTile[0] : null;
  const unitOwner = firstUnit ? players.find(p => p.id === firstUnit.ownerId) : null;
  const unitBgColor = unitOwner ? PLAYER_BG_COLORS[unitOwner.color] : 'bg-slate-600';

  // 🌟 [추가] 위인 정보 및 소유자 색상 계산
  const greatPerson = tile.greatPerson;
  const gpOwner = greatPerson ? players.find(p => p.id === greatPerson.ownerId) : null;
  const gpBgColor = gpOwner ? PLAYER_BG_COLORS[gpOwner.color] : 'bg-amber-600'; // 소유자 없으면 황금색

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
  if (tile.greatPerson) {
      const icon = GREAT_PERSON_ICONS[tile.greatPerson.type] || '🌟';
      const ownerName = gpOwner ? gpOwner.name : '알 수 없음';
      tooltip += `\n위인(${ownerName}): ${tile.greatPerson.type.toUpperCase()} ${icon}\n${tile.greatPerson.description}`;
  }
  if (hasBuilding && buildingDef) tooltip += `\n건물: ${buildingDef.name}`;
  else if (tile.resource !== 'none') tooltip += `\n자원: ${RESOURCE_ICONS[tile.resource]}`;
  tooltip += `\n생산: ${tileYield.production}, 교역: ${tileYield.trade}, 문화: ${tileYield.culture}`;

  const myFloatingTexts = useMemo(() => {
    return floatingTexts.filter(ft => ft.x === tile.position.x && ft.y === tile.position.y);
  }, [floatingTexts, tile.position.x, tile.position.y]);

  const isPlacingGreatPerson = targetingMode?.isActive && targetingMode.techId === 'place_great_person';
  const canPlaceGreatPersonHere = isPlacingGreatPerson ? isValidGreatPersonTile(currentPlayer, map, tile.position.x, tile.position.y).valid : false;

  // 🌟 우측 상단 아이콘 중복 방지 로직 (위인 토큰이 0순위)
  const showGpToken = !!greatPerson;
  const showMiniBuilding = hasBuilding && buildingDef && !hasCity && (!hasUnits || showGpToken); 
  const showMiniResource = !hasBuilding && tile.resource !== 'none' && !hasCity && (!hasUnits || showGpToken);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full h-full aspect-square rounded-sm flex flex-col items-center justify-center transition-all relative overflow-hidden',
        TERRAIN_COLORS[tile.terrain],
        isSelected && 'ring-2 ring-white scale-110 z-10',
        owner && !isSelected && `ring-1 ${ownerRingClass}`,
        canMoveHere && 'ring-2 ring-green-400 animate-pulse',
        'hover:brightness-110',
        canPlaceGreatPersonHere && 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse z-30',
        isPlacingGreatPerson && !canPlaceGreatPersonHere && 'opacity-30 grayscale cursor-not-allowed',
        
        // 🌟 [추가 3] 위인 타일 황금빛 아우라 (Glow) 효과
        greatPerson && 'shadow-[inset_0_0_15px_rgba(251,191,36,0.4)] ring-1 ring-amber-500/50'
      )}
      title={tooltip}
    >
      {/* 🌟 [추가 3-1] 은은한 황금빛 오버레이 (프리미엄 질감) */}
      {greatPerson && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-amber-900/20 pointer-events-none z-0" />
      )}

      {/* 마비 상태 표시 */}
      {isParalyzed && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-red-900/40 rounded-sm pointer-events-none">
          <span className="text-2xl drop-shadow-lg">⚡</span>
        </div>
      )}

      {/* 1. 건물 표시 (중앙) */}
      {hasBuilding && buildingDef && !hasCity && !hasUnits && !showGpToken && (
        <span className="text-[12px] mb-2 pointer-events-none z-10">{BUILDING_ICONS[buildingType] || '🏗️'}</span>
      )}

      {/* 2. 자원 표시 (중앙) */}
      {!hasBuilding && tile.resource !== 'none' && !hasCity && !hasUnits && !showGpToken && (
        <span className="text-[10px] mb-2 pointer-events-none z-10">{RESOURCE_ICONS[tile.resource]}</span>
      )}

      {/* 도시 표시 (중앙) */}
      {hasCity && (
        <div className="flex flex-col items-center mb-1 pointer-events-none z-10 relative">
          <span className="text-lg leading-none">🏛️</span>
          {owner && (
            <div className={`w-3 h-1 rounded ${PLAYER_BG_COLORS[owner.color]}`} />
          )}
        </div>
      )}

      {/* 유닛 표시 (중앙 토큰) */}
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

      {/* 도시 위 유닛 수 표시 (좌측 상단 팝업) */}
      {hasCity && hasUnits && (
        <span className={clsx(
          "absolute top-0 left-0 text-[10px] rounded-full w-4 h-4 flex items-center justify-center text-white z-20 pointer-events-none font-bold border border-white/50 shadow-sm",
          unitBgColor
        )}>
          {tile.unitIds.length}
        </span>
      )}
      
      {/* 오두막/마을 렌더링 (중앙) */}
      {tile.object && !tile.cityId && !hasUnits && !showGpToken && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-2xl filter drop-shadow-md animate-pulse">
            {tile.object.type === 'hut' ? '🛖' : '⛺'}
          </span>
        </div>
      )}

      {/* 🌟 [수정 2] 우측 상단 미니 아이콘 컨테이너 (위인 포함) */}
      <div className="absolute top-0 right-0 p-0.5 flex flex-col items-end gap-0.5 z-30 pointer-events-none">
          
          {/* 🌟 [추가 1] 위인 소형 토큰 (0순위, 플레이어 색상 배경) */}
          {showGpToken && (
              <div className={clsx(
                  "w-4 h-4 rounded-full flex items-center justify-center border border-white/60 shadow-md transform translate-x-0.5 -translate-y-0.5",
                  gpBgColor
              )} title={`위인 가호 (${gpOwner?.name})`}>
                  <span className="text-[10px] filter drop-shadow-sm leading-none">
                      {GREAT_PERSON_ICONS[greatPerson.type] || '🌟'}
                  </span>
              </div>
          )}

          {/* 건물/자원 미니 아이콘 (위인이 있으면 한 칸 아래로 밀림) */}
          {showMiniBuilding && (
              <span className="text-[8px] leading-none bg-slate-950/40 rounded px-0.5 py-0.25 border border-slate-700/50">
                  {BUILDING_ICONS[buildingType!] || '🏗️'}
              </span>
          )}
          {showMiniResource && (
              <span className="text-[8px] leading-none bg-slate-950/40 rounded px-0.5 py-0.25 border border-slate-700/50">
                  {RESOURCE_ICONS[tile.resource]}
              </span>
          )}

          {/* 적 유닛 경고 (맨 아래) */}
          {hasEnemyUnits && (
              <span className="text-[8px] animate-bounce text-red-400 drop-shadow">⚠️</span>
          )}
      </div>

      {/* 불가사의 (중앙 배경) */}
      {tile.wonder && tile.wonder.type && (
        <div className="absolute inset-0 flex items-center justify-center z-1 pointer-events-none opacity-60">
            <span className="text-3xl filter drop-shadow-lg" title={WONDERS[tile.wonder.type]?.name}>
                {WONDER_ICONS[tile.wonder.type] || '🏛️'}
            </span>
        </div>
      )}
      
      {/* 🌟 [삭제] 기존의 거대 위인 렌더링 삭제 */}

      {/* 자원 생산량 시각화 (하단 오버레이) */}
      <div className="absolute bottom-0 w-full flex justify-center gap-0.5 bg-black/30 backdrop-blur-[1px] rounded-b-sm py-[1px] pointer-events-none z-10">
        {tileYield.production > 0 && (
          <div className="flex items-center leading-none">
            <span className="text-[clamp(5px,0.6vw,8px)] text-orange-300">🔨</span>
            <span className="text-[clamp(5px,0.6vw,8px)] text-white font-bold ml-[1px]">{tileYield.production}</span>
          </div>
        )}
        {tileYield.trade > 0 && (
          <div className="flex items-center leading-none">
            <span className="text-[clamp(5px,0.6vw,8px)] text-yellow-300">📦</span>
            <span className="text-[clamp(5px,0.6vw,8px)] text-white font-bold ml-[1px]">{tileYield.trade}</span>
          </div>
        )}
        {tileYield.culture > 0 && (
          <div className="flex items-center leading-none">
            <span className="text-[clamp(5px,0.6vw,8px)] text-purple-300">📜</span>
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