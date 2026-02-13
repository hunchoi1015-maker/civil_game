import { GameMap, Position, Tile, TerrainType, ResourceType } from '../../types';

export function generateMap(width: number, height: number): GameMap {
  const resources: ResourceType[] = ['spice', 'wheat', 'silk', 'iron', 'none'];
  const tiles: Tile[][] = [];
  
  // 청크 크기 정의
  const CHUNK_SIZE = 4;
  const lastChunkX = Math.floor(width / CHUNK_SIZE) - 1;
  const lastChunkY = Math.floor(height / CHUNK_SIZE) - 1;

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType;
      // ... (기존 지형 생성 로직 유지) ...
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
      
      const hasResource = terrain !== 'water' && Math.random() < 0.20;
      const resource: ResourceType = hasResource
        ? resources[Math.floor(Math.random() * (resources.length - 1))]
        : 'none';

      // [수정] 청크 기반 가시성 설정
      const chunkX = Math.floor(x / CHUNK_SIZE);
      const chunkY = Math.floor(y / CHUNK_SIZE);
      
      // 코너 청크인지 확인 (0,0 / 0,max / max,0 / max,max)
      const isCornerChunk = 
        (chunkX === 0 || chunkX === lastChunkX) && 
        (chunkY === 0 || chunkY === lastChunkY);

      row.push({
        id: `${x}-${y}`,
        position: { x, y },
        terrain,
        resource,
        cityId: null,
        buildingType: null,
        unitIds: [],
        ownerId: null,
        isExplored: isCornerChunk, // 코너만 true, 나머지는 false
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