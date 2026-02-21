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
    // 🌟 추가된 스토어 변수들
    targetingMode, cancelTargeting, useTechResourceAbility,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  //비행 상태 
  const [flightDecision, setFlightDecision] = useState<{unitIds: string[], movementBefore: number} | null>(null);
  if (!map || map.tiles.length === 0) {
    return <div className="text-slate-400">맵을 불러오는 중...</div>;
  }

  const handleTileClick = (x: number, y: number) => {
    const tile = map.tiles[y][x];

    // 기술 스킬 타겟팅 처리 (가장 먼저 가로챔!)
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
      
      else if (targetingMode.techId === 'communism') {
        useTechResourceAbility('communism', { x, y });
        cancelTargeting();
      }
      return; // 스킬을 쐈으므로 여기서 종료
    }

    if (activeCardTargeting && activeCardTargeting.templateId === 'exile') {
      handleCardMapClick({ x, y });
      return; 
    }

    const selectedUnitData = selectedUnit ? currentPlayer.units.find(u => u.id === selectedUnit) : null;

    if (currentPhase === 'movement' && selectedUnitData && selectedUnitData.movement > 0) {
      const dx = Math.abs(x - selectedUnitData.position.x);
      const dy = Math.abs(y - selectedUnitData.position.y);
      const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      // 🌟 1. 기술 보유 여부 확인 (물 진입 및 비행 통과 패시브)
      const hasSailing = currentPlayer.technologies.some(t => t.id === 'sailing');
      const hasNavigation = currentPlayer.technologies.some(t => t.id === 'navigation');
      const hasFlight = currentPlayer.technologies.some(t => t.id === 'flight');

      // 🌟 2. 물 타일 진입 가능 여부 검사
      // 항해술(sailing)이나 범선항해술(navigation), 비행(flight)이 있으면 물에 들어갈 수 있습니다.
      const canEnterWater = tile.terrain !== 'water' || hasSailing || hasNavigation || hasFlight;

      // 상하좌우 1칸이고, 물 타일 진입 조건을 만족했다면 이동 승인!
      if (isAdjacent && canEnterWater) {
        
        // 🌟 [추가] 팝업이 떠 있는 동안에는 맵을 클릭할 수 없습니다!
        if (flightDecision) return; 

        if (tile.terrain === 'water' && !hasNavigation && !hasFlight && selectedUnitData.movement === 1) {
            alert("항해술(1레벨)만으로는 물 타일에서 턴을 마칠 수 없습니다. 육지로 빠져나가야 합니다.");
            return;
        }

        const movementBefore = selectedUnitData.movement;

        if (selectedUnits.length > 1) {
          moveSelectedUnits({ x, y });
        } else {
          moveUnit(selectedUnitData.id, { x, y });
        }
        setSelectedTile({ x, y });

        // ==========================================
        // 🌟 [비행] 패시브: 상공 통과 vs 착륙 공격 분기
        // ==========================================
        const enemyUnits = players.filter(p => p.id !== currentPlayer.id).flatMap(p => p.units.filter(u => u.position.x === x && u.position.y === y));
        const hasEnemyCity = tile.cityId && !currentPlayer.cities.some(c => c.id === tile.cityId);
        
        if (enemyUnits.length > 0 || hasEnemyCity) {
           if (!hasFlight) {
               // 비행이 없으면 무조건 멈춥니다 (기존)
               useGameStore.setState((state) => {
                  const p = state.players[state.currentPlayerIndex];
                  const targetIds = state.selectedUnits.length > 1 ? state.selectedUnits : [selectedUnitData.id];
                  targetIds.forEach(id => {
                     const u = p.units.find(u => u.id === id);
                     if (u) u.movement = 0; 
                  });
               });
           } else {
               // 🌟 비행이 있고, 이동력이 1보다 많이 남았다면 팝업을 띄웁니다!
               if (movementBefore > 1) {
                   const targetIds = selectedUnits.length > 1 ? selectedUnits : [selectedUnitData.id];
                   setFlightDecision({ unitIds: targetIds, movementBefore });
               } else {
                   // 이동력이 1밖에 없었다면 어차피 멈춰야 하므로 바로 0으로 만듭니다.
                   useGameStore.setState((state) => {
                      const p = state.players[state.currentPlayerIndex];
                      const targetIds = state.selectedUnits.length > 1 ? state.selectedUnits : [selectedUnitData.id];
                      targetIds.forEach(id => {
                         const u = p.units.find(u => u.id === id);
                         if (u) u.movement = 0;
                      });
                   });
               }
           }
        }
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-block bg-slate-800 p-4 rounded-lg overflow-auto">
      {/* 🌟 [추가] 비행 유닛 통과 결정 모달창 */}
      {flightDecision && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
          <div className="bg-slate-800 border-2 border-indigo-500 rounded-xl p-6 shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-white mb-2">✈️ 상공 통과</h3>
            <p className="text-slate-300 mb-6 text-sm">
              적대적 유닛이나 도시에 진입했습니다.<br/>어떻게 하시겠습니까?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  useGameStore.setState((state) => {
                    const p = state.players[state.currentPlayerIndex];
                    flightDecision.unitIds.forEach(id => {
                       const u = p.units.find(u => u.id === id);
                       // 🌟 통과 선택: 이동력 1만 깎고 남겨줍니다!
                       if (u) u.movement = flightDecision.movementBefore - 1; 
                    });
                  });
                  setFlightDecision(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                상공 통과 (이동 계속하기)
              </button>
              
              <button 
                onClick={() => {
                  useGameStore.setState((state) => {
                    const p = state.players[state.currentPlayerIndex];
                    flightDecision.unitIds.forEach(id => {
                       const u = p.units.find(u => u.id === id);
                       // 🌟 착륙 선택: 이동력을 모두 소모하고 정지합니다!
                       if (u) u.movement = 0; 
                    });
                  });
                  setFlightDecision(null);
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                착륙 및 공격 (이동 멈춤)
              </button>
            </div>
          </div>
        </div>
      )}
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