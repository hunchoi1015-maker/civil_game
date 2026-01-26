import { GameMap, Tile, TerrainType, ResourceType, Position } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface MapGeneratorConfig {
  width: number;
  height: number;
  waterRatio?: number;
  mountainRatio?: number;
  forestRatio?: number;
  resourceDensity?: number;
}

const DEFAULT_CONFIG: Required<Omit<MapGeneratorConfig, 'width' | 'height'>> = {
  waterRatio: 0.15,
  mountainRatio: 0.1,
  forestRatio: 0.2,
  resourceDensity: 0.25,
};

export function generateMap(config: MapGeneratorConfig): GameMap {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { width, height } = fullConfig;

  const tiles: Tile[][] = [];

  // 기본 지형 생성
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const terrain = generateTerrain(x, y, fullConfig);
      const resource = generateResource(terrain, fullConfig.resourceDensity);

      row.push({
        id: uuidv4(),
        position: { x, y },
        terrain,
        resource,
        cityId: null,
        buildingId: null,
        unitIds: [],
        ownerId: null,
        isExplored: true,
        isVisible: true,
      });
    }
    tiles.push(row);
  }

  // 맵 가장자리에 물 배치
  for (let x = 0; x < width; x++) {
    if (Math.random() < 0.3) {
      tiles[0][x].terrain = 'water';
      tiles[0][x].resource = 'none';
    }
    if (Math.random() < 0.3) {
      tiles[height - 1][x].terrain = 'water';
      tiles[height - 1][x].resource = 'none';
    }
  }

  for (let y = 0; y < height; y++) {
    if (Math.random() < 0.3) {
      tiles[y][0].terrain = 'water';
      tiles[y][0].resource = 'none';
    }
    if (Math.random() < 0.3) {
      tiles[y][width - 1].terrain = 'water';
      tiles[y][width - 1].resource = 'none';
    }
  }

  return { width, height, tiles };
}

function generateTerrain(
  _x: number,
  _y: number,
  config: Required<MapGeneratorConfig>
): TerrainType {
  const random = Math.random();

  if (random < config.waterRatio) return 'water';
  if (random < config.waterRatio + config.mountainRatio) return 'mountain';
  if (random < config.waterRatio + config.mountainRatio + config.forestRatio) return 'forest';

  // 나머지는 초원, 사막 중 선택
  const remaining = Math.random();
  if (remaining < 0.7) return 'grassland';
  return 'desert';
}

function generateResource(terrain: TerrainType, density: number): ResourceType {
  if (terrain === 'water' || terrain === 'mountain') {
    return Math.random() < density * 0.5 ? 'gold' : 'none';
  }

  if (Math.random() > density) return 'none';

  const resourcesByTerrain: Record<TerrainType, ResourceType[]> = {
    grassland: ['wheat', 'wheat', 'silk'],
    forest: ['wheat', 'iron', 'spice'],
    mountain: ['iron', 'gold'],
    desert: ['gold', 'incense'],
    water: ['gold'],
  };

  const options = resourcesByTerrain[terrain];
  return options[Math.floor(Math.random() * options.length)];
}

export function getValidStartPositions(
  map: GameMap,
  playerCount: number,
  _minDistance: number = 4
): Position[] {
  const { width, height } = map;
  const positions: Position[] = [];
  const margin = 2;

  // 코너 기반 시작 위치
  const corners: Position[] = [
    { x: margin, y: margin },
    { x: width - margin - 1, y: height - margin - 1 },
    { x: width - margin - 1, y: margin },
    { x: margin, y: height - margin - 1 },
  ];

  for (let i = 0; i < playerCount && i < corners.length; i++) {
    const corner = corners[i];
    // 물이 아닌 가장 가까운 타일 찾기
    const validPosition = findNearestValidTile(map, corner);
    if (validPosition) {
      positions.push(validPosition);
    }
  }

  return positions;
}

function findNearestValidTile(map: GameMap, start: Position): Position | null {
  const { width, height, tiles } = map;
  const visited = new Set<string>();
  const queue: Position[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const tile = tiles[current.y]?.[current.x];
    if (tile && tile.terrain !== 'water' && tile.terrain !== 'mountain') {
      return current;
    }

    // 인접 타일 추가
    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.x >= 0 &&
        neighbor.x < width &&
        neighbor.y >= 0 &&
        neighbor.y < height
      ) {
        queue.push(neighbor);
      }
    }
  }

  return null;
}

export function calculateDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
