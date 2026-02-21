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

      // 🌟 1. 기술 보유 여부 확인 (이동 패시브)
      const hasNavigation = currentPlayer.technologies.some(t => ['navigation', 'steam_power', 'flight'].includes(t.id));
      const hasFlight = currentPlayer.technologies.some(t => t.id === 'flight');

      // 🌟 2. 물 타일 진입 가능 여부 확인
      const canEnterWater = tile.terrain !== 'water' || hasNavigation;

      // 상하좌우 1칸이고, 물 타일 진입 조건을 만족했다면 이동 승인!
      if (isAdjacent && canEnterWater) {
        if (selectedUnits.length > 1) {
          moveSelectedUnits({ x, y });
        } else {
          moveUnit(selectedUnitData.id, { x, y });
        }
        setSelectedTile({ x, y });

        // ==========================================
        // 🌟 3. [비행] 패시브: 적 타일 진입 시 정지(강제 이동력 0) 룰 처리
        // ==========================================
        // 이동한 타일에 적 유닛이나 적 도시/건물이 있는지 검사합니다.
        const enemyUnits = players.filter(p => p.id !== currentPlayer.id).flatMap(p => p.units.filter(u => u.position.x === x && u.position.y === y));
        const hasEnemyCity = tile.cityId && !currentPlayer.cities.some(c => c.id === tile.cityId);
        
        // 적을 만났는데 '비행' 기술이 없다면? => 발이 묶여서 남은 이동력이 전부 소멸(0)됩니다!
        if ((enemyUnits.length > 0 || hasEnemyCity) && !hasFlight) {
           useGameStore.setState((state) => {
              const p = state.players[state.currentPlayerIndex];
              const u = p.units.find(u => u.id === selectedUnitData.id);
              if (u) u.movement = 0; // 강제 정지! (전투 발생 등)
           });
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