import { GameMap, Tile, TerrainType, ResourceType, Position, TileObject, RewardType } from '../../types';

export function generateMap(width: number, height: number): GameMap {
  const resources: ResourceType[] = ['spice', 'wheat', 'silk', 'iron', 'none'];
  const tiles: Tile[][] = [];
  
  // 1. 기본 지형 생성
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType;
      // 가장자리 물
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

      // 초기 가시성: 코너 청크만 true
      const CHUNK_SIZE = 4;
      const lastChunkX = Math.floor(width / CHUNK_SIZE) - 1;
      const lastChunkY = Math.floor(height / CHUNK_SIZE) - 1;
      const chunkX = Math.floor(x / CHUNK_SIZE);
      const chunkY = Math.floor(y / CHUNK_SIZE);
      const isCornerChunk = (chunkX === 0 || chunkX === lastChunkX) && (chunkY === 0 || chunkY === lastChunkY);

      row.push({
        id: `${x}-${y}`,
        position: { x, y },
        terrain,
        resource,
        cityId: null,
        buildingType: null,
        unitIds: [],
        ownerId: null,
        isExplored: isCornerChunk,
        isVisible: true,
        object: undefined, // 초기화
      });
    }
    tiles.push(row);
  }

  const CHUNK_SIZE = 4;
  const chunksX = Math.floor(width / CHUNK_SIZE); // 4
  const chunksY = Math.floor(height / CHUNK_SIZE); // 4
  
  // 1. 유효 청크 인덱스 수집 (코너 제외)
  const validChunkIndices: number[] = [];
  for(let cy = 0; cy < chunksY; cy++) {
    for(let cx = 0; cx < chunksX; cx++) {
      // (0,0), (3,0), (0,3), (3,3) 제외
      const isCorner = (cx === 0 || cx === chunksX - 1) && (cy === 0 || cy === chunksY - 1);
      if (!isCorner) {
        validChunkIndices.push(cy * chunksX + cx);
      }
    }
  }
  // 유효 청크: 12개. 각 청크 당 2개씩 배치 = 총 24개 배치.

  // 2. 보상 덱 구성 (총 30개 중 셔플해서 24개 사용)
  const hutRewards: RewardType[] = [
    ...Array(5).fill({ type: 'resource', resource: 'wheat' }),
    ...Array(5).fill({ type: 'resource', resource: 'silk' }),
    ...Array(2).fill({ type: 'resource', resource: 'iron' }),
    ...Array(5).fill({ type: 'resource', resource: 'spice' }),
    ...Array(3).fill({ type: 'spy' }),
  ]; 
  const villageRewards: RewardType[] = [
    ...Array(3).fill({ type: 'resource', resource: 'iron' }),
    ...Array(2).fill({ type: 'greatPerson' }),
    ...Array(3).fill({ type: 'spy' }),
    ...Array(2).fill({ type: 'nuclear' }),
  ];

  const shuffle = <T>(array: T[]) => array.sort(() => Math.random() - 0.5);
  const shuffledHuts = shuffle([...hutRewards]);
  const shuffledVillages = shuffle([...villageRewards]);
  
  // 3. 청크 타입 할당 (12개 청크에 분배)
  // A(Hut+Vil), B(Hut+Hut), C(Vil+Vil)
  // 대략 A:5, B:6, C:1 비율로 섞음
  const chunkTypes: ('A' | 'B' | 'C')[] = [
    ...Array(5).fill('A'),
    ...Array(6).fill('B'),
    ...Array(1).fill('C'),
  ];
  const shuffledChunkTypes = shuffle(chunkTypes);

  // 4. 배치 실행
  validChunkIndices.forEach((chunkIndex, i) => {
      const type = shuffledChunkTypes[i];
      const cx = chunkIndex % chunksX;
      const cy = Math.floor(chunkIndex / chunksX);

      const objectsToPlace: { type: 'hut' | 'village' }[] = [];
      if (type === 'A') objectsToPlace.push({ type: 'hut' }, { type: 'village' });
      else if (type === 'B') objectsToPlace.push({ type: 'hut' }, { type: 'hut' });
      else objectsToPlace.push({ type: 'village' }, { type: 'village' });

      // 청크 내 유효 타일 (물 제외)
      const validTiles: { x: number, y: number }[] = [];
      for (let y = cy * CHUNK_SIZE; y < (cy + 1) * CHUNK_SIZE; y++) {
        for (let x = cx * CHUNK_SIZE; x < (cx + 1) * CHUNK_SIZE; x++) {
          if (tiles[y][x].terrain !== 'water') {
            validTiles.push({ x, y });
          }
        }
      }

      const shuffledTiles = shuffle(validTiles);

      objectsToPlace.forEach(objType => {
        if (shuffledTiles.length === 0) return;
        
        let reward: RewardType | undefined;
        if (objType.type === 'hut') reward = shuffledHuts.pop();
        else reward = shuffledVillages.pop();

        // 덱 소진 시 기본값 (Fallback)
        if (!reward) {
             reward = objType.type === 'hut' 
                ? { type: 'resource', resource: 'wheat' } 
                : { type: 'resource', resource: 'iron' };
        }

        const pos = shuffledTiles.pop()!;
        tiles[pos.y][pos.x].object = {
          type: objType.type,
          reward,
        };
      });
  });

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