import {BuildingType} from "./city";

export interface Position {
  x: number;
  y: number;
}

export type TerrainType =
  | 'grassland'
  | 'forest'
  | 'mountain'
  | 'desert'
  | 'water';

export type ResourceType = 'spice' | 'wheat' | 'silk' | 'iron' | 'none';

export interface Tile {
  id: string;
  position: Position;
  terrain: TerrainType;
  resource: ResourceType;
  cityId: string | null;
  buildingType: BuildingType | null;
  unitIds: string[];
  ownerId: string | null;
  isExplored: boolean;
  isVisible: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

// 변경된 지형 속성 (요구사항 반영)
export const TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperty> = {
  grassland: {
    name: '초원',
    movementCost: 1,
    productionBonus: 0,
    tradeBonus: 0,
    cultureBonus: 0,
    isPassable: true,
    requiresTech: null,
  },
  forest: {
    name: '숲',
    movementCost: 1,
    productionBonus: 2,
    tradeBonus: 0,
    cultureBonus: 0,
    isPassable: true,
    requiresTech: null,
  },
  mountain: {
    name: '산악',
    movementCost: 1,
    productionBonus: 1,
    tradeBonus: 0,
    cultureBonus: 0,
    isPassable: true,
    requiresTech: null,
  },
  desert: {
    name: '사막',
    movementCost: 1,
    productionBonus: 0,
    tradeBonus: 1,
    cultureBonus: 0,
    isPassable: true,
    requiresTech: null,
  },
  water: {
    name: '물',
    movementCost: 1,
    productionBonus: 0,
    tradeBonus: 1,
    cultureBonus: 0,
    isPassable: false,
    requiresTech: 'sailing', // 항해 기술로 통과 가능
  },
};

export interface TerrainProperty {
  name: string;
  movementCost: number;
  productionBonus: number;
  tradeBonus: number;
  cultureBonus: number;
  isPassable: boolean;
  requiresTech: string | null;
}



// [수정] 생산량/교역량 속성(value) 삭제, 이름만 유지
export interface ResourceProperty {
  name: string;
}

export const RESOURCE_PROPERTIES: Record<ResourceType, ResourceProperty> = {
  wheat: { name: '밀' },
  iron: { name: '철' },
  silk: { name: '비단' },
  spice: { name: '향료' }, // CityPanel과 통일성을 위해 '향료'로 지정
  none: { name: '없음' },
};

// 인접 4칸 (대각선 미포함)
export function getAdjacentPositions(pos: Position, mapWidth: number, mapHeight: number): Position[] {
  const directions = [
    { x: 0, y: -1 },  // 상
    { x: -1, y: 0 },  // 좌
    { x: 1, y: 0 },   // 우
    { x: 0, y: 1 },   // 하
  ];

  return directions
    .map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
    .filter(p => p.x >= 0 && p.x < mapWidth && p.y >= 0 && p.y < mapHeight);
}

// 주변 8칸 (교외 지역)
export function getSurroundingPositions(pos: Position, mapWidth: number, mapHeight: number): Position[] {
  const directions = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 },                   { x: 1, y: 0 },
    { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
  ];

  return directions
    .map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
    .filter(p => p.x >= 0 && p.x < mapWidth && p.y >= 0 && p.y < mapHeight);
}

// 시작 위치 옵션 (플레이어별 4개 위치)
export function getStartPositionOptions(playerIndex: number, mapWidth: number, mapHeight: number): Position[] {
  const options: Position[][] = [
    // 1번 플레이어: 좌상단
    [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
    // 2번 플레이어: 우하단
    [
      { x: mapWidth - 3, y: mapHeight - 3 },
      { x: mapWidth - 2, y: mapHeight - 3 },
      { x: mapWidth - 3, y: mapHeight - 2 },
      { x: mapWidth - 2, y: mapHeight - 2 },
    ],
    // 3번 플레이어: 우상단
    [
      { x: mapWidth - 3, y: 2 },
      { x: mapWidth - 2, y: 2 },
      { x: mapWidth - 3, y: 3 },
      { x: mapWidth - 2, y: 3 },
    ],
    // 4번 플레이어: 좌하단
    [
      { x: 2, y: mapHeight - 3 },
      { x: 3, y: mapHeight - 3 },
      { x: 3, y: mapHeight - 2 },
      { x: 2, y: mapHeight - 2 },
    ],
  ];

  return options[playerIndex] || [];
}
