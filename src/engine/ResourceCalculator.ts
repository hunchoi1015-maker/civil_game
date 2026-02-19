import {
  Position,
  GameMap,
  Tile,
  City,
  Player,
  TERRAIN_PROPERTIES,
  getSurroundingPositions,
} from '../types';
import { BUILDINGS } from '../constants/buildings';

// 타일 수확량 인터페이스
export interface TileYield {
  production: number;
  trade: number;
  culture: number;
}

// 타일 기본 수확량 계산 (단일 타일 기준)
export function calculateTileYield(tile: Tile): TileYield {
  // 1. 건물 확인: 건물이 있으면 타일/자원 생산량을 무시하고 건물의 효과로 대체
  // (개발자 주: 건물 효과가 '대체'인지 '추가'인지 기획에 따라 다르나, 현재 코드 맥락상 건물 효과가 우선시되는 것으로 보입니다.
  //  만약 건물이 추가 보너스라면 로직을 `base + building`으로 변경해야 합니다. 
  //  기존 로직을 존중하여 '대체' 로직을 유지하되, 필요시 수정 가능합니다.)
  if (tile.buildingType && BUILDINGS[tile.buildingType]) {
    const buildingDef = BUILDINGS[tile.buildingType];
    return {
      production: buildingDef.effects.productionBonus,
      trade: buildingDef.effects.tradeBonus,
      culture: buildingDef.effects.cultureBonus,
    };
  }

  // 2. 건물이 없으면 지형(Terrain) 속성만 사용 (자원 보너스 제거됨)
  const terrain = TERRAIN_PROPERTIES[tile.terrain];

  return {
    production: terrain.productionBonus, 
    trade: terrain.tradeBonus,
    culture: terrain.cultureBonus,
  };
}

// 도시 주변 8칸 타일 가져오기
export function getCitySurroundingTiles(city: City, map: GameMap): Tile[] {
  const positions = getSurroundingPositions(city.position, map.width, map.height);
  return positions.map(pos => map.tiles[pos.y][pos.x]);
}

// [수정] 도시의 총 생산량 계산 (일관성 확보)
export function calculateCityProduction(city: City, map: GameMap): number {
  let production = 0;
  
  // 1. 도시 중심부 타일 수확량
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    const cityTile = map.tiles[city.position.y][city.position.x];
    production += calculateTileYield(cityTile).production;
  }

  // 2. 주변 8칸 타일 수확량
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    production += calculateTileYield(tile).production;
  }

  // 3. (옵션) 도시 자체의 건물들이 주는 추가 보너스가 있다면 여기서 합산
  // 주의: 타일에 지어진 건물(농장 등)은 calculateTileYield에서 이미 계산됨.
  // 여기서는 '도시 내부'에 지어진 건물(성벽, 병영 등)의 효과를 더해야 함.
  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    // 타일에 건설되는 건물이 아닌, 도시 내부에만 존재하는 건물(예: 성벽)의 생산력 보너스가 있다면 추가
    // 현재 로직상 buildInCity에서 타일에도 buildingType을 박아버리므로 중복 계산되지 않도록 주의해야 함.
    // 만약 city.buildings에 있는 건물이 타일 위에도 존재한다면, 위 1,2번 단계에서 이미 계산되었을 수 있음.
    
    // 안전한 방법: city.buildings는 '보유 목록'이고, 맵 상의 타일이 '실체'라면
    // 타일 루프(1,2번)만으로 충분할 수 있음. 
    // 하지만 '성벽' 같이 타일을 차지하지 않는 건물이 있다면 여기서 더해줘야 함.
    if (def && !def.allowedTerrain) { // 타일 제한이 없는(도시 내부 전용) 건물만 추가
         production += def.effects.productionBonus;
    }
  });

  if (city.tempProductionBonus) {
      production += city.tempProductionBonus;
  }
  
  return production;
}

// [수정] 도시의 총 교역량 계산 (일관성 확보)
export function calculateCityTrade(city: City, map: GameMap): number {
  let trade = 0;

  // 1. 도시 중심부
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     trade += calculateTileYield(cityTile).trade;
  }

  // 2. 주변 8칸
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    trade += calculateTileYield(tile).trade;
  }

  // 3. 도시 내부 건물 보너스 (타일 점유 안하는 건물)
  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         trade += def.effects.tradeBonus;
    }
  });

  return trade;
}

// [수정] 도시의 총 문화량 계산 (일관성 확보)
export function calculateCityCulture(city: City, map: GameMap): number {
  let culture = 0;

  // 1. 도시 중심부
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     culture += calculateTileYield(cityTile).culture;
  }

  // 2. 주변 8칸
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    culture += calculateTileYield(tile).culture;
  }

  // 3. 도시 내부 건물 보너스
  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         culture += def.effects.cultureBonus;
    }
  });

  return culture;
}

// 플레이어 총 교역량
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

// 플레이어 총 생산량
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