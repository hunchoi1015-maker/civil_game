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
  const terrain = TERRAIN_PROPERTIES[tile.terrain];
  const resource = RESOURCE_PROPERTIES[tile.resource];

  return {
    production: terrain.productionBonus + resource.productionValue,
    trade: terrain.tradeBonus + resource.tradeValue,
    culture: terrain.cultureBonus,
  };
}

// 도시 주변 8칸 타일 가져오기
export function getCitySurroundingTiles(city: City, map: GameMap): Tile[] {
  const positions = getSurroundingPositions(city.position, map.width, map.height);
  return positions.map(pos => map.tiles[pos.y][pos.x]);
}

// 도시의 생산량 계산 (주변 8칸 타일 + 건물 보너스)
export function calculateCityProduction(city: City, map: GameMap): number {
  let production = 0;

  // 주변 8칸 타일 생산량
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    // 물 타일은 기본적으로 자원 생산 불가
    if (tile.terrain === 'water') continue;
    const yield_ = calculateTileYield(tile);
    production += yield_.production;
  }

  // 건물 보너스
  for (const building of city.buildings) {
    const buildingDef = BUILDINGS[building.type];
    if (buildingDef) {
      production += buildingDef.effects.productionBonus;
    }
  }

  return production;
}

// 도시의 교역량 계산 (주변 8칸 타일 + 건물 보너스)
export function calculateCityTrade(city: City, map: GameMap): number {
  let trade = 0;

  // 주변 8칸 타일 교역량
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    const yield_ = calculateTileYield(tile);
    trade += yield_.trade;
  }

  // 건물 보너스
  for (const building of city.buildings) {
    const buildingDef = BUILDINGS[building.type];
    if (buildingDef) {
      trade += buildingDef.effects.tradeBonus;
    }
  }

  return trade;
}

// 도시의 문화량 계산 (주변 8칸 타일 + 건물 보너스)
export function calculateCityCulture(city: City, map: GameMap): number {
  let culture = 0;

  // 주변 8칸 타일 문화량
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    const yield_ = calculateTileYield(tile);
    culture += yield_.culture;
  }

  // 건물 보너스
  for (const building of city.buildings) {
    const buildingDef = BUILDINGS[building.type];
    if (buildingDef) {
      culture += buildingDef.effects.cultureBonus;
    }
  }

  return culture;
}

// 플레이어의 총 교역 수입 계산 (모든 도시의 주변 8칸)
export function calculatePlayerTrade(player: Player, map: GameMap): number {
  let totalTrade = 0;

  for (const city of player.cities) {
    totalTrade += calculateCityTrade(city, map);
  }

  // 정치체제 보너스
  if (player.government === 'democracy') totalTrade += 3;
  if (player.government === 'republic') totalTrade += 1;
  if (player.government === 'communism') totalTrade -= 1;

  return Math.max(0, totalTrade);
}

// 플레이어의 총 생산량 계산 (모든 도시의 주변 8칸)
export function calculatePlayerProduction(player: Player, map: GameMap): number {
  let totalProduction = 0;

  for (const city of player.cities) {
    totalProduction += calculateCityProduction(city, map);
  }

  // 정치체제 보너스
  if (player.government === 'monarchy') totalProduction += 2;
  if (player.government === 'communism') totalProduction += 3;
  if (player.government === 'republic') totalProduction += 1;

  return totalProduction;
}

// 플레이어의 총 문화량 계산 (모든 도시의 주변 8칸)
export function calculatePlayerCulture(player: Player, map: GameMap): number {
  let totalCulture = 0;

  for (const city of player.cities) {
    totalCulture += calculateCityCulture(city, map);
  }

  return totalCulture;
}

// 특정 타일의 수확량 정보 반환 (시각화용)
export function getTileYieldInfo(position: Position, map: GameMap): TileYield | null {
  if (position.x < 0 || position.x >= map.width || position.y < 0 || position.y >= map.height) {
    return null;
  }
  const tile = map.tiles[position.y][position.x];
  return calculateTileYield(tile);
}

// 건물 건설 비용 검증 (생산량 >= 비용)
export function canAffordBuilding(city: City, map: GameMap, buildingProductionCost: number): boolean {
  const cityProduction = calculateCityProduction(city, map);
  return cityProduction >= buildingProductionCost;
}

// 유닛 생산 비용 검증 (플레이어 총 생산량 >= 비용)
export function canAffordUnit(player: Player, map: GameMap, unitProductionCost: number): boolean {
  const totalProduction = calculatePlayerProduction(player, map);
  return totalProduction >= unitProductionCost;
}
