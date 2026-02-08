import { GameMap, Position, Tile, TerrainType } from '../../types';

export function generateMap(width: number, height: number): GameMap {
  const resources = ['wheat', 'iron', 'gold', 'silk', 'incense', 'spice', 'none'] as const;
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        terrain = Math.random() < 0.7 ? 'water' : 'grassland';
      } else {
        const rand = Math.random();
        if (rand < 0.35) terrain = 'grassland';
        else if (rand < 0.55) terrain = 'forest';
        else if (rand < 0.70) terrain = 'mountain';
        else if (rand < 0.85) terrain = 'desert';
        else terrain = 'water';
      }
      const hasResource = terrain !== 'water' && Math.random() < 0.25;
      const resource = hasResource
        ? resources[Math.floor(Math.random() * (resources.length - 1))]
        : 'none';
      row.push({
        id: `${x}-${y}`,
        position: { x, y },
        terrain,
        resource,
        cityId: null,
        buildingType: null,
        unitIds: [],
        ownerId: null,
        isExplored: true,
        isVisible: true,
      });
    }
    tiles.push(row);
  }
  return { width, height, tiles };
}

export function setAdjacentTilesOwner(map: GameMap, center: Position, ownerId: string) {
  const directions = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 },                   { x: 1, y: 0 },
    { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
  ];
  for (const dir of directions) {
    const x = center.x + dir.x;
    const y = center.y + dir.y;
    if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
      if (!map.tiles[y][x].ownerId) {
        map.tiles[y][x].ownerId = ownerId;
      }
    }
  }
}

export function getTileSafe(map: GameMap, position: Position): Tile | null {
  if (
    position.x < 0 ||
    position.x >= map.width ||
    position.y < 0 ||
    position.y >= map.height
  ) {
    return null;
  }
  return map.tiles[position.y][position.x];
}