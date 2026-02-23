import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { TileComponent } from './TileComponent';
import { motion } from 'framer-motion';

export function MapGrid() {
  const {
    map,
    selectedTile, setSelectedTile,
    selectedUnit, selectedUnits, setSelectedUnit,
    moveUnit, moveSelectedUnits,
    currentPhase, players, currentPlayerIndex,
    activeCardTargeting, handleCardMapClick,
    targetingMode, cancelTargeting, useTechResourceAbility,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  // 🌟 [수정] 비행 상태에 목적지 좌표(targetX, targetY) 추가
  const [flightDecision, setFlightDecision] = useState<{unitIds: string[], movementBefore: number, targetX: number, targetY: number} | null>(null);
  
  if (!map || map.tiles.length === 0) {
    return <div className="text-slate-400">맵을 불러오는 중...</div>;
  }

  const handleTileClick = (x: number, y: number) => {
    const tile = map.tiles[y][x];

    // 기술 스킬 타겟팅 처리 (기록, 공산주의 등)
    if (targetingMode?.isActive) {
      if (targetingMode.techId === 'writing') {
        if (tile.cityId) {
          const cityOwner = players.find(p => p.cities.some(c => c.id === tile.cityId));
          if (cityOwner && cityOwner.id !== currentPlayer.id) {
            useTechResourceAbility('writing', { targetCityId: tile.cityId, targetPlayerId: cityOwner.id });
            cancelTargeting();
          } else {
            alert('자신의 도시는 지목할 수 없습니다. 상대방 도시를 선택하세요.');
          }
        } else {
          alert('도시가 있는 칸을 선택해야 합니다.');
        }
      } 
      // 공산주의
      else if (targetingMode.techId === 'communism') {
        useTechResourceAbility('communism', { x, y });
        cancelTargeting();
      }
      // 증기력 
      else if (targetingMode.techId === 'steam_power') {
        useTechResourceAbility('steam_power', { x, y });
        cancelTargeting();
      }
      return; 
    }

    // 카드 타겟팅 처리
    if (activeCardTargeting && activeCardTargeting.templateId === 'exile') {
      handleCardMapClick({ x, y });
      return; 
    }

    const selectedUnitData = selectedUnit ? currentPlayer.units.find(u => u.id === selectedUnit) : null;

    if (currentPhase === 'movement' && selectedUnitData && selectedUnitData.movement > 0) {
      const dx = Math.abs(x - selectedUnitData.position.x);
      const dy = Math.abs(y - selectedUnitData.position.y);
      const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      // 기술 보유 여부 확인 
      const hasSailing = currentPlayer.technologies.some(t => t.id === 'sailing');
      const hasNavigation = currentPlayer.technologies.some(t => t.id === 'navigation');
      const hasFlight = currentPlayer.technologies.some(t => t.id === 'flight');

      // 물 타일 진입 가능 여부 검사
      const canEnterWater = tile.terrain !== 'water' || hasSailing || hasNavigation || hasFlight;

      // 이동 승인!
      if (isAdjacent && canEnterWater) {
        
        // 팝업이 떠 있는 동안에는 맵 클릭 방지
        if (flightDecision) return; 

        if (tile.terrain === 'water' && !hasNavigation && !hasFlight && selectedUnitData.movement === 1) {
            alert("항해술(1레벨)만으로는 물 타일에서 턴을 마칠 수 없습니다. 육지로 빠져나가야 합니다.");
            return;
        }

        const movementBefore = selectedUnitData.movement;

        // ==========================================
        // 🌟 [비행] 상공 통과 vs 착륙 판단 (오두막, 마을 포함)
        // ==========================================
        const enemyUnits = players.filter(p => p.id !== currentPlayer.id).flatMap(p => p.units.filter(u => u.position.x === x && u.position.y === y));
        const hasEnemyCity = tile.cityId && !currentPlayer.cities.some(c => c.id === tile.cityId);
        
        // 🌟 [추가] 목적지 타일에 오두막이나 마을이 있는지 확인!
        const hasObject = !!tile.object; 

        // 적이 있거나, 탐색물이 있다면 멈출지 넘어갈지 결정해야 합니다.
        const isHostileOrObject = enemyUnits.length > 0 || hasEnemyCity || hasObject;
        
        // 비행 능력이 있고, 장애물이 있고, 이동력이 충분히 남아있을 때 먼저 팝업을 띄웁니다!
        if (isHostileOrObject && hasFlight && movementBefore > 1) {
            const targetIds = selectedUnits.length > 1 ? selectedUnits : [selectedUnitData.id];
            setFlightDecision({ unitIds: targetIds, movementBefore, targetX: x, targetY: y });
            return; // 팝업 띄우고 여기서 일시 정지!
        }

        // ==========================================
        // 비행이 없거나, 이동력이 1밖에 없어서 팝업 없이 
        // 무조건 착륙(정상 이동)해야 하는 경우 처리
        // ==========================================
        if (selectedUnits.length > 1) {
          moveSelectedUnits({ x, y });
        } else {
          moveUnit(selectedUnitData.id, { x, y });
        }
        setSelectedTile({ x, y });

        // (스토어의 moveUnit 함수가 정상적으로 오두막, 마을, 전투를 다 알아서 처리해 줍니다!)
        return;
      }
    }

    // 이동이 아닌 단순 타일/유닛 선택 처리
    const myUnitsOnTile = currentPlayer.units.filter(u => u.position.x === x && u.position.y === y);
    if (myUnitsOnTile.length > 0) {
      setSelectedUnit(myUnitsOnTile[0].id);
    } else {
      setSelectedUnit(null);
    }
    setSelectedTile({ x, y });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-block bg-slate-800 p-4 rounded-lg overflow-auto">
      
      {/* 🌟 [수정된 모달창] */}
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
                  // [상공 통과]: 스토어의 전투/오두막 로직을 싹 다 무시하고 타일 배열만 강제로 옮깁니다.
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
                          u.movement = flightDecision.movementBefore - 1; // 1칸 이동치만 소모!
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
                  // [착륙]: 스토어의 정상 moveUnit 로직을 태워서 보상을 얻거나 전투를 치릅니다.
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

      {/* 맵 타일 렌더링 */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}>
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