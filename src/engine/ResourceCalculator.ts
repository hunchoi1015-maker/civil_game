// src/engine/ResourceCalculator.ts

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
import { WONDERS, WonderType } from '../types/wonder';

// 타일 수확량 인터페이스
export interface TileYield {
  production: number;
  trade: number;
  culture: number;
}

// 타일 기본 수확량 계산 (단일 타일 기준)
export function calculateTileYield(tile: Tile): TileYield {
  let production = 0;
  let trade = 0;
  let culture = 0;

  // 🌟 1순위: 위인이 있다면? 기존 지형/건물 싹 다 무시하고 위인 스탯으로 덮어쓰기!
  if (tile.greatPerson) {
    production = tile.greatPerson.stats.production;
    trade = tile.greatPerson.stats.trade;
    culture = tile.greatPerson.stats.culture;
  }
  // 🌟 2순위: 불가사의가 있다면? 불가사의 스탯으로 덮어쓰기!
  else if (tile.wonder) {
    const wonderDef = WONDERS[tile.wonder.type as WonderType];
    if (wonderDef) {
      production = 0; 
      trade = 0;
      culture = wonderDef.cultureProduction;
    }
  }
  // 🌟 3순위: 건물이 있다면? 건물 스탯으로 덮어쓰기!
  else if (tile.buildingType && BUILDINGS[tile.buildingType]) {
    const buildingDef = BUILDINGS[tile.buildingType];
    production = buildingDef.effects.productionBonus;
    trade = buildingDef.effects.tradeBonus;
    culture = buildingDef.effects.cultureBonus;
  }
  // 🌟 4순위: 아무것도 없는 빈 땅이라면? 지형 기본 스탯 적용!
  else {
    const terrain = TERRAIN_PROPERTIES[tile.terrain];
    production = terrain.productionBonus;
    trade = terrain.tradeBonus;
    culture = terrain.cultureBonus;
  }

  return { production, trade, culture };
}

// 도시 주변 8칸 타일 가져오기
export function getCitySurroundingTiles(city: City, map: GameMap): Tile[] {
  const positions = getSurroundingPositions(city.position, map.width, map.height);
  return positions.map(pos => map.tiles[pos.y][pos.x]);
}

// 기존 도시 총 생산량 계산 (Player 파라미터가 없는 호환성 유지용 - 군사학 보너스 제외된 순수 도시 생산력)
export function calculateCityProduction(city: City, map: GameMap): number {
  let production = 0;
  
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    const cityTile = map.tiles[city.position.y][city.position.x];
    production += calculateTileYield(cityTile).production;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    production += calculateTileYield(tile).production;
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) { 
         production += def.effects.productionBonus;
    }
  });

  if (city.tempProductionBonus) {
      production += city.tempProductionBonus;
  }
  
  return production;
}

// 🌟 [신규] 도시의 생산력 상세 내역 반환 (UI 표시 및 군사학 적용용)
export function calculateDetailedCityProduction(city: City, map: GameMap, player: Player): { 
  total: number, 
  base: number, 
  buildings: number, 
  militaryScience: number, 
  tempBonus: number 
} {
  let base = 0;
  let buildings = 0;

  // 1. 도시 중심부 타일 수확량 (기본 지형)
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    const cityTile = map.tiles[city.position.y][city.position.x];
    base += calculateTileYield(cityTile).production;
  }

  // 2. 주변 8칸 타일 수확량 (기본 지형)
  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    base += calculateTileYield(tile).production;
  }

  // 3. 도시 내부 건물 보너스
  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) { 
         buildings += def.effects.productionBonus;
    }
  });

  // 4. 임시 보너스 (자원 소모 스킬 등)
  const tempBonus = city.tempProductionBonus || 0;

  // 5. 🌟 군사학 보너스 (각 도시별로 적용: 보유 화폐 3개당 +1)
  let militaryScience = 0;
  if (player.technologies.some(t => t.id === 'military_science')) {
      militaryScience = Math.floor(player.resources.currency / 3);
  }

  const total = base + buildings + tempBonus + militaryScience;

  return { total, base, buildings, militaryScience, tempBonus };
}

// 도시의 총 교역량 계산
export function calculateCityTrade(city: City, map: GameMap): number {
  let trade = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     trade += calculateTileYield(cityTile).trade;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    trade += calculateTileYield(tile).trade;
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         trade += def.effects.tradeBonus;
    }
  });

  return trade;
}

// 도시의 총 문화량 계산
export function calculateCityCulture(city: City, map: GameMap): number {
  let culture = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     culture += calculateTileYield(cityTile).culture;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    culture += calculateTileYield(tile).culture;
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         culture += def.effects.cultureBonus;
    }
  });

  return culture;
}

// 플레이어 총 교역량 (민주주의 +2, 근본주의 -2 적용)
export function calculatePlayerTrade(player: Player, map: GameMap): number {
  let totalTrade = 0;
  for (const city of player.cities) {
    totalTrade += calculateCityTrade(city, map);
  }
  
  if (player.government === 'democracy') totalTrade += 2;
  if (player.government === 'fundamentalism') totalTrade -= 2;
  
  return Math.max(0, totalTrade); 
}

// 🌟 [수정] 플레이어 총 생산량 (군사학 보너스가 각 도시에 적용되도록 변경)
export function calculatePlayerProduction(player: Player, map: GameMap): number {
  let totalProduction = 0;
  
  for (const city of player.cities) {
    // 🌟 상세 계산기를 사용하여 각 도시마다 군사학 보너스가 포함된 값을 합산합니다!
    totalProduction += calculateDetailedCityProduction(city, map, player).total;
  }
  
  // 공산주의 채택 시 보유한 도시 개수만큼 2씩 추가!
  if (player.government === 'communism') {
      totalProduction += (player.cities.length * 2);
  }
  
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