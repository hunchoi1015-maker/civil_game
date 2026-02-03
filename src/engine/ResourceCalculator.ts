import {
  Position,
  GameMap,
  Tile,
  TerrainType,
  ResourceType,
  City,
  Player,
  TERRAIN_PROPERTIES,
  RESOURCE_PROPERTIES,
  getSurroundingPositions,
} from '../types';
import { BUILDINGS } from '../constants/buildings';

// 타일 수확량 인터페이스
export interface TileYield {
  production: number;
  trade: number;
  culture: number;
}

// 타일 기본 수확량 계산
export function calculateTileYield(tile: Tile): TileYield {
  // 1. 건물 확인: 건물이 있으면 타일/자원 생산량을 무시하고 건물의 효과로 대체
  if (tile.buildingType && BUILDINGS[tile.buildingType]) {
    const buildingDef = BUILDINGS[tile.buildingType];
    // 건물 정의의 effects에서 보너스 수치를 가져와 생산량으로 사용
    return {
      production: buildingDef.effects.productionBonus,
      trade: buildingDef.effects.tradeBonus,
      culture: buildingDef.effects.cultureBonus,
    };
  }

  // 2. 건물이 없으면 기존 로직 (지형 + 자원)
  const terrain = TERRAIN_PROPERTIES[tile.terrain];
  const resource = RESOURCE_PROPERTIES[tile.resource];

  // 만약 resource가 'none'이거나 정의되지 않았을 경우를 대비한 안전 장치
  const resourceProduction = resource ? resource.productionValue : 0;
  const resourceTrade = resource ? resource.tradeValue : 0;

  return {
    production: terrain.productionBonus + resourceProduction,
    trade: terrain.tradeBonus + resourceTrade,
    culture: terrain.cultureBonus,
  };
}

// 도시 주변 8칸 타일 가져오기
export function getCitySurroundingTiles(city: City, map: GameMap): Tile[] {
  const positions = getSurroundingPositions(city.position, map.width, map.height);
  return positions.map(pos => map.tiles[pos.y][pos.x]);
}

// 도시의 생산량 계산 (주변 8칸 타일 + 도시 중심부 타일)
export function calculateCityProduction(city: City, map: GameMap): number {
  let production = 0;

  // 1. 주변 8칸 타일 생산량 합산
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    if (tile.terrain === 'water') continue;
    const yield_ = calculateTileYield(tile);
    production += yield_.production;
  }

  // 2. 도시 중심부 타일 자체의 생산량 합산
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     const yield_ = calculateTileYield(cityTile);
     production += yield_.production;
  }

  return production;
}

// 도시의 교역량 계산
export function calculateCityTrade(city: City, map: GameMap): number {
  let trade = 0;

  // 1. 주변 8칸
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    const yield_ = calculateTileYield(tile);
    trade += yield_.trade;
  }

  // 2. 도시 중심부
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     const yield_ = calculateTileYield(cityTile);
     trade += yield_.trade;
  }

  return trade;
}

// 도시의 문화량 계산
export function calculateCityCulture(city: City, map: GameMap): number {
  let culture = 0;

  // 1. 주변 8칸
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    const yield_ = calculateTileYield(tile);
    culture += yield_.culture;
  }

  // 2. 도시 중심부
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     const yield_ = calculateTileYield(cityTile);
     culture += yield_.culture;
  }

  return culture;
}

// 플레이어 총 교역량 (정치체제 보너스 포함)
export function calculatePlayerTrade(player: Player, map: GameMap): number {
  let totalTrade = 0;
  for (const city of player.cities) {
    totalTrade += calculateCityTrade(city, map);
  }
  if (player.government === 'democracy') totalTrade += 3;
  if (player.government === 'republic') totalTrade += 1;
  if (player.government === 'communism') totalTrade -= 1;
  return Math.max(0, totalTrade);
}

// 플레이어 총 생산량 (정치체제 보너스 포함 - 통계용)
export function calculatePlayerProduction(player: Player, map: GameMap): number {
  let totalProduction = 0;
  for (const city of player.cities) {
    totalProduction += calculateCityProduction(city, map);
  }
  if (player.government === 'monarchy') totalProduction += 2;
  if (player.government === 'communism') totalProduction += 3;
  if (player.government === 'republic') totalProduction += 1;
  return totalProduction;
}

// 플레이어 총 문화량
export function calculatePlayerCulture(player: Player, map: GameMap): number {
  let totalCulture = 0;
  for (const city of player.cities) {
    totalCulture += calculateCityCulture(city, map);
  }
  return totalCulture;
}

// UI 표시용 타일 수확량 정보
export function getTileYieldInfo(position: Position, map: GameMap): TileYield | null {
  if (position.x < 0 || position.x >= map.width || position.y < 0 || position.y >= map.height) {
    return null;
  }
  const tile = map.tiles[position.y][position.x];
  return calculateTileYield(tile);
}

// 비용 검증 함수들
export function canAffordBuilding(city: City, map: GameMap, buildingProductionCost: number): boolean {
  const cityProduction = calculateCityProduction(city, map);
  return cityProduction >= buildingProductionCost;
}

export function canAffordUnit(city: City, map: GameMap, unitProductionCost: number): boolean {
  const cityProduction = calculateCityProduction(city, map);
  return cityProduction >= unitProductionCost;
}