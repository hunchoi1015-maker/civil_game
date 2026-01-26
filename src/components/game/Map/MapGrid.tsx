import { useGameStore } from '../../../store/gameStore';
import { TileComponent } from './TileComponent';
import { motion } from 'framer-motion';

export function MapGrid() {
  const {
    map,
    selectedTile,
    setSelectedTile,
    selectedUnit,
    selectedUnits,
    setSelectedUnit,
    moveUnit,
    moveSelectedUnits,
    currentPhase,
    players,
    currentPlayerIndex,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  if (!map || map.tiles.length === 0) {
    return <div className="text-slate-400">맵을 불러오는 중...</div>;
  }

  const handleTileClick = (x: number, y: number) => {
    const tile = map.tiles[y][x];
    const selectedUnitData = selectedUnit
      ? currentPlayer.units.find(u => u.id === selectedUnit)
      : null;

    // 이동 단계에서 선택된 유닛이 있고, 이동 가능한 타일을 클릭한 경우
    if (currentPhase === 'movement' && selectedUnitData && !selectedUnitData.hasMoved && selectedUnitData.movement > 0) {
      const canMoveHere = tile.terrain !== 'water' &&
        Math.abs(x - selectedUnitData.position.x) <= 1 &&
        Math.abs(y - selectedUnitData.position.y) <= 1 &&
        !(x === selectedUnitData.position.x && y === selectedUnitData.position.y);

      if (canMoveHere) {
        // 그룹 이동 또는 단일 이동
        if (selectedUnits.length > 1) {
          moveSelectedUnits({ x, y });
        } else {
          moveUnit(selectedUnitData.id, { x, y });
        }
        setSelectedTile({ x, y });
        return;
      }
    }

    // 타일에 내 유닛이 있으면 선택
    const myUnitsOnTile = currentPlayer.units.filter(u =>
      u.position.x === x && u.position.y === y
    );

    if (myUnitsOnTile.length > 0) {
      setSelectedUnit(myUnitsOnTile[0].id);
    } else {
      setSelectedUnit(null);
    }

    setSelectedTile({ x, y });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-block bg-slate-800 p-4 rounded-lg overflow-auto"
    >
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
        }}
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
