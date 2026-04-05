// src/components/game/Map/MapGrid.tsx

import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { TileComponent } from './TileComponent';
import { motion } from 'framer-motion';
import clsx from 'clsx'; // 🌟 clsx 추가

export function MapGrid() {
  const {
    map,
    selectedTile, setSelectedTile,
    selectedUnit, selectedUnits, setSelectedUnit,
    moveUnit, moveSelectedUnits,
    currentPhase, players, currentPlayerIndex,
    activeCardTargeting, handleCardMapClick,
    targetingMode, cancelTargeting, useTechResourceAbility,
    placeGreatPerson, addToast
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  const [flightDecision, setFlightDecision] = useState<{unitIds: string[], movementBefore: number, targetX: number, targetY: number} | null>(null);
  
  // 🌟 [추가] 맵 확대/축소 모드 상태
  const [isZoomed, setIsZoomed] = useState(false);
  
  if (!map || map.tiles.length === 0) {
    return <div className="text-slate-400">맵을 불러오는 중...</div>;
  }

  const handleTileClick = (x: number, y: number) => {
    const tile = map.tiles[y][x];

    // 기술 스킬 타겟팅 처리
    if (targetingMode?.isActive) {
      if (targetingMode.techId === 'writing') {
        if (tile.cityId) {
          const cityOwner = players.find(p => p.cities.some(c => c.id === tile.cityId));
          if (cityOwner && cityOwner.id !== currentPlayer.id) {
            useTechResourceAbility('writing', { targetCityId: tile.cityId, targetPlayerId: cityOwner.id });
            cancelTargeting();
          } else {
            addToast('자신의 도시는 지목할 수 없습니다. 상대방 도시를 선택하세요.');
          }
        } else {
          addToast('도시가 있는 칸을 선택해야 합니다.');
        }
      } 
      else if (targetingMode.techId === 'communism') {
        useTechResourceAbility('communism', { x, y });
        cancelTargeting();
      }
      else if (targetingMode.techId === 'steam_power') {
        useTechResourceAbility('steam_power', { x, y });
        cancelTargeting();
      }
      else if (targetingMode.techId === 'atomic_theory') {
        if (!tile.cityId) {
          addToast('핵 공격은 도시가 있는 타일(🏛️)에만 할 수 있습니다.');
          return;
        }
        useTechResourceAbility('atomic_theory', { x, y });
        cancelTargeting();
      }
      else if (targetingMode.techId === 'place_great_person') {
        const gpToPlace = currentPlayer.unplacedGreatPeople?.[0];
        if (!gpToPlace) {
            cancelTargeting();
            return;
        }
        placeGreatPerson(currentPlayer.id, gpToPlace.id, x, y);
        cancelTargeting();
      }
      return; 
    }

    // 카드 타겟팅 처리
    if (
      activeCardTargeting && 
      [
        'exile', 'drought', 'confusion', 'sabotage', 'deforestation', 'disappearance', 
        'disaster', 'queens_day', 'dictators_day', 
        'command_collapse', 'mass_asylum', 'cataclysm' 
      ].includes(activeCardTargeting.templateId)
    ) {
      handleCardMapClick({ x, y });
      return; 
    }

    const selectedUnitData = selectedUnit ? currentPlayer.units.find(u => u.id === selectedUnit) : null;

    if (currentPhase === 'movement' && selectedUnitData && selectedUnitData.movement > 0) {
      const dx = Math.abs(x - selectedUnitData.position.x);
      const dy = Math.abs(y - selectedUnitData.position.y);
      const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      const hasSailing = currentPlayer.technologies.some(t => t.id === 'sailing');
      const hasNavigation = currentPlayer.technologies.some(t => t.id === 'navigation');
      const hasFlight = currentPlayer.technologies.some(t => t.id === 'flight');

      const canEnterWater = tile.terrain !== 'water' || hasSailing || hasNavigation || hasFlight;

      if (isAdjacent && canEnterWater) {
        if (flightDecision) return; 

        if (tile.terrain === 'water' && !hasNavigation && !hasFlight && selectedUnitData.movement === 1) {
            addToast("항해술(1레벨)만으로는 물 타일에서 턴을 마칠 수 없습니다. 육지로 빠져나가야 합니다.");
            return;
        }

        const movementBefore = selectedUnitData.movement;

        const enemyUnits = players.filter(p => p.id !== currentPlayer.id).flatMap(p => p.units.filter(u => u.position.x === x && u.position.y === y));
        const hasEnemyCity = tile.cityId && !currentPlayer.cities.some(c => c.id === tile.cityId);
        const hasObject = !!tile.object; 

        const isHostileOrObject = enemyUnits.length > 0 || hasEnemyCity || hasObject;
        
        if (isHostileOrObject && hasFlight && movementBefore > 1) {
            const targetIds = selectedUnits.length > 1 ? selectedUnits : [selectedUnitData.id];
            setFlightDecision({ unitIds: targetIds, movementBefore, targetX: x, targetY: y });
            return; 
        }

        if (selectedUnits.length > 1) {
          moveSelectedUnits({ x, y });
        } else {
          moveUnit(selectedUnitData.id, { x, y });
        }
        setSelectedTile({ x, y });
        return;
      }
    }

    const myUnitsOnTile = currentPlayer.units.filter(u => u.position.x === x && u.position.y === y);
    if (myUnitsOnTile.length > 0) {
      setSelectedUnit(myUnitsOnTile[0].id);
    } else {
      setSelectedUnit(null);
    }
    setSelectedTile({ x, y });
  };

  return (
    // 🌟 [수정] Zoom 모드에 따라 컨테이너의 스크롤 허용 여부를 동적으로 변경
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={clsx(
        "w-full h-full bg-slate-950/40 rounded-xl shadow-inner relative",
        isZoomed ? "overflow-auto p-4 sm:p-6" : "flex flex-col items-center justify-center overflow-hidden p-1 sm:p-2"
      )}
    >
      
      {/* 🌟 [추가] 맵 확대/축소 토글 버튼 */}
      <button
        onClick={() => setIsZoomed(!isZoomed)}
        className="absolute top-4 left-4 z-[45] bg-slate-900/90 hover:bg-slate-800 text-amber-100 border border-amber-600/50 px-3 py-2 rounded-lg shadow-lg text-xs font-serif font-bold flex items-center gap-2 backdrop-blur-sm transition-all"
      >
        <span className="text-lg">{isZoomed ? '🔍' : '🔎'}</span>
        {isZoomed ? '한 눈에 보기' : '맵 확대하기'}
      </button>

      {/* 비행 상공 통과 모달 */}
      {flightDecision && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
          <div className="bg-slate-800 border-2 border-indigo-500 rounded-xl p-6 shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-white mb-2">✈️ 상공 통과</h3>
            <p className="text-slate-300 mb-6 text-sm">
              적 유닛/도시 또는 탐색물(오두막/마을) 위를 지납니다.<br/>어떻게 하시겠습니까?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  useGameStore.setState((state) => {
                    const p = state.players[state.currentPlayerIndex];
                    const newTile = state.map.tiles[flightDecision.targetY][flightDecision.targetX];
                    
                    flightDecision.unitIds.forEach(id => {
                       const u = p.units.find(u => u.id === id);
                       if (u) {
                          const oldTile = state.map.tiles[u.position.y][u.position.x];
                          oldTile.unitIds = oldTile.unitIds.filter(uid => uid !== id);
                          newTile.unitIds.push(id);
                          
                          u.position = { x: flightDecision.targetX, y: flightDecision.targetY };
                          u.movement = flightDecision.movementBefore - 1; 
                       }
                    });
                  });
                  setSelectedTile({ x: flightDecision.targetX, y: flightDecision.targetY });
                  setFlightDecision(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                상공 통과 (그대로 지나가기)
              </button>
              
              <button 
                onClick={() => {
                  if (flightDecision.unitIds.length > 1) {
                    moveSelectedUnits({ x: flightDecision.targetX, y: flightDecision.targetY });
                  } else {
                    moveUnit(flightDecision.unitIds[0], { x: flightDecision.targetX, y: flightDecision.targetY });
                  }
                  
                  setSelectedTile({ x: flightDecision.targetX, y: flightDecision.targetY });
                  setFlightDecision(null);
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                착륙 (탐색 또는 공격하기)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 맵 타일 렌더링 영역 */}
      <div 
        className={clsx(
          "grid gap-[1px] md:gap-[2px]",
          isZoomed ? "w-max mx-auto mt-12" : "w-full" // 확대 시 스크롤 발생을 위해 w-max 적용, 상단 버튼 피하기 위해 mt-12
        )} 
        style={
          isZoomed 
          ? {
              // 🔍 확대 모드: 타일 크기를 무조건 72px 이상으로 크게 고정하여 스크롤 발생
              gridTemplateColumns: `repeat(${map.width}, minmax(55px, 55px))` 
            }
          : {
              // 🗺️ 한 눈에 보기 모드: 여백(18rem -> 6rem)을 줄여서 한 화면 내에서 맵을 최대한 크게 렌더링
              gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
              maxWidth: `min(100%, calc((100vh - 14.5rem) * (${map.width} / ${map.height})))`,
              aspectRatio: `${map.width} / ${map.height}` 
            }
        }
      >
        {map.tiles.map((row, y) =>
          row.map((tile, x) => (
            <TileComponent
              key={tile.id}
              tile={tile}
              isSelected={selectedTile?.x === x && selectedTile?.y === y}
              onClick={() => handleTileClick(x, y)}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}