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
import { isWonderActive } from '../store/helpers/playerHelpers'; 
import { isTileBlockedByEnemy } from '../store/helpers/mapHelpers';

export interface TileYield {
  production: number;
  trade: number;
  culture: number;
}

// 🌟 [수정 1] 타일 1개 계산: players 배열을 받아와서 불가사의 봉쇄 여부를 판정합니다.
export function calculateTileYield(tile: Tile, players?: Player[]): TileYield {
  let production = 0;
  let trade = 0;
  let culture = 0;

  if (tile.greatPerson) {
    production = tile.greatPerson.stats.production;
    trade = tile.greatPerson.stats.trade;
    culture = tile.greatPerson.stats.culture;
  }
  else if (tile.wonder) {
    // 🌟 1) 불가사의가 제 기능을 하는지(봉쇄/무효화되지 않았는지) 검사합니다.
    let active = true;
    if (players) {
        active = isWonderActive(tile, players);
    }
    
    // 🌟 2) 봉쇄되지 않았을 때만 능력을 줍니다!
    if (active) {
        const wonderDef = WONDERS[tile.wonder.type as WonderType];
        if (wonderDef) {
          production = 0; 
          trade = 0;
          culture = wonderDef.cultureProduction;
        }
    }
  }
  else if (tile.buildingType && BUILDINGS[tile.buildingType]) {
    const buildingDef = BUILDINGS[tile.buildingType];
    production = buildingDef.effects.productionBonus;
    trade = buildingDef.effects.tradeBonus;
    culture = buildingDef.effects.cultureBonus;
  }
  else {
    const terrain = TERRAIN_PROPERTIES[tile.terrain];
    production = terrain.productionBonus;
    trade = terrain.tradeBonus;
    culture = terrain.cultureBonus;
  }

  return { production, trade, culture };
}

export function getCitySurroundingTiles(city: City, map: GameMap): Tile[] {
  const positions = getSurroundingPositions(city.position, map.width, map.height);
  return positions.map(pos => map.tiles[pos.y][pos.x]);
}

// 🌟 [수정] 생산력 계산에 봉쇄 판정 및 개척자 보너스 반영
export function calculateCityProduction(city: City, map: GameMap, players?: Player[]): number {
  let production = 0;
  
  // 플레이어 ID 식별 (isTileBlockedByEnemy 파라미터용)
  const owner = players?.find(p => p.cities.some(c => c.id === city.id));
  const ownerId = owner ? owner.id : '';

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    if (!players || !isTileBlockedByEnemy(players, ownerId, city.position.x, city.position.y)) {
      const cityTile = map.tiles[city.position.y][city.position.x];
      production += calculateTileYield(cityTile, players).production;
    }
  }

  const surroundingPositions = getSurroundingPositions(city.position, map.width, map.height);
  for (const pos of surroundingPositions) {
    if (!players || !isTileBlockedByEnemy(players, ownerId, pos.x, pos.y)) {
      const tile = map.tiles[pos.y][pos.x];
      production += calculateTileYield(tile, players).production;
    }
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
  
  // 🌟 개척자 타일 보급 보너스 합산
  if (city.pioneerProductionBonus) {
      production += city.pioneerProductionBonus;
  }

  if (owner && owner.government === 'communism') {
      production += 2;
  }
  
  return production;
}

export function calculateDetailedCityProduction(city: City, map: GameMap, player: Player, players?: Player[]): { 
  total: number, 
  base: number, 
  buildings: number, 
  militaryScience: number, 
  tempBonus: number,
  pioneerBonus: number,
  governmentBonus?: number // 🌟 리턴 타입에 정치체제 보너스 추가 (CityPanel 에러 방지를 위해 optional 처리)
} {
  let base = 0;
  let buildings = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    if (!isTileBlockedByEnemy(players || [], player.id, city.position.x, city.position.y)) {
      const cityTile = map.tiles[city.position.y][city.position.x];
      base += calculateTileYield(cityTile, players).production;
    }
  }

  const surroundingPositions = getSurroundingPositions(city.position, map.width, map.height);
  for (const pos of surroundingPositions) {
    if (!isTileBlockedByEnemy(players || [], player.id, pos.x, pos.y)) {
      const tile = map.tiles[pos.y][pos.x];
      base += calculateTileYield(tile, players).production;
    }
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) { 
         buildings += def.effects.productionBonus;
    }
  });

  const tempBonus = city.tempProductionBonus || 0;
  let militaryScience = 0;
  if (player.technologies.some(t => t.id === 'military_science')) {
      militaryScience = Math.floor(player.resources.currency / 3);
  }

  const pioneerBonus = city.pioneerProductionBonus || 0;

  // 🌟 [추가] 공산주의 보너스 계산
  let governmentBonus = 0;
  if (player.government === 'communism') {
      governmentBonus = 2;
  }

  // 총합에 정부 보너스도 포함!
  const total = base + buildings + tempBonus + militaryScience + pioneerBonus + governmentBonus;

  return { total, base, buildings, militaryScience, tempBonus, pioneerBonus, governmentBonus };
}

// 🌟 [수정] 교역력 계산에 봉쇄 판정 및 개척자 보너스 반영
export function calculateCityTrade(city: City, map: GameMap, players?: Player[]): number {
  let trade = 0;
  const owner = players?.find(p => p.cities.some(c => c.id === city.id));
  const ownerId = owner ? owner.id : '';

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     if (!players || !isTileBlockedByEnemy(players, ownerId, city.position.x, city.position.y)) {
       const cityTile = map.tiles[city.position.y][city.position.x];
       trade += calculateTileYield(cityTile, players).trade;
     }
  }

  const surroundingPositions = getSurroundingPositions(city.position, map.width, map.height);
  for (const pos of surroundingPositions) {
    if (!players || !isTileBlockedByEnemy(players, ownerId, pos.x, pos.y)) {
      const tile = map.tiles[pos.y][pos.x];
      trade += calculateTileYield(tile, players).trade;
    }
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         trade += def.effects.tradeBonus;
    }
  });

  // 🌟 개척자 타일 보급 교역 보너스 합산
  if (city.pioneerTradeBonus) {
      trade += city.pioneerTradeBonus;
  }

  return trade;
}

// 🌟 [수정] 문화력 계산에 봉쇄 판정 반영 (문화는 개척자 보너스가 없으므로 차단 로직만 적용)
export function calculateCityCulture(city: City, map: GameMap, players?: Player[]): number {
  let culture = 0;
  const owner = players?.find(p => p.cities.some(c => c.id === city.id));
  const ownerId = owner ? owner.id : '';

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     if (!players || !isTileBlockedByEnemy(players, ownerId, city.position.x, city.position.y)) {
       const cityTile = map.tiles[city.position.y][city.position.x];
       culture += calculateTileYield(cityTile, players).culture;
     }
  }

  const surroundingPositions = getSurroundingPositions(city.position, map.width, map.height);
  for (const pos of surroundingPositions) {
    if (!players || !isTileBlockedByEnemy(players, ownerId, pos.x, pos.y)) {
      const tile = map.tiles[pos.y][pos.x];
      culture += calculateTileYield(tile, players).culture;
    }
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         culture += def.effects.cultureBonus;
    }
  });

  return culture;
}

// 🌟 [수정 3] 플레이어 총합 계산 시에도 players를 넘겨줍니다.
export function calculatePlayerTrade(player: Player, map: GameMap, players?: Player[]): number {
  let totalTrade = 0;
  for (const city of player.cities) {
    totalTrade += calculateCityTrade(city, map, players);
  }
  
  if (player.government === 'democracy') totalTrade += 2;
  if (player.government === 'fundamentalism') totalTrade -= 2;
  
  return Math.max(0, totalTrade); 
}

export function calculatePlayerProduction(player: Player, map: GameMap, players?: Player[]): number {
  let totalProduction = 0;
  
  for (const city of player.cities) {
    totalProduction += calculateDetailedCityProduction(city, map, player, players).total;
  }
  
  return totalProduction;
}

export function calculatePlayerCulture(player: Player, map: GameMap, players?: Player[]): number {
  let totalCulture = 0;
  for (const city of player.cities) {
    totalCulture += calculateCityCulture(city, map, players);
  }
  return totalCulture;
}

export function getTileYieldInfo(position: Position, map: GameMap, players?: Player[]): TileYield | null {
  if (position.x < 0 || position.x >= map.width || position.y < 0 || position.y >= map.height) {
    return null;
  }
  const tile = map.tiles[position.y][position.x];
  return calculateTileYield(tile, players);
}

export function canAffordBuilding(city: City, map: GameMap, buildingProductionCost: number, players?: Player[]): boolean {
  const cityProduction = calculateCityProduction(city, map, players);
  return cityProduction >= buildingProductionCost;
}

export function canAffordUnit(city: City, map: GameMap, unitProductionCost: number, players?: Player[]): boolean {
  const cityProduction = calculateCityProduction(city, map, players);
  return cityProduction >= unitProductionCost;
}