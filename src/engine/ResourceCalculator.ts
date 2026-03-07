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
import { isWonderActive } from '../store/helpers/playerHelpers'; // 🌟 봉쇄 판정 헬퍼 임포트

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

// 🌟 [수정 2] 도시 계산 함수들: 외부에서 players를 받아와서 calculateTileYield로 넘겨줍니다.
export function calculateCityProduction(city: City, map: GameMap, players?: Player[]): number {
  let production = 0;
  
  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    const cityTile = map.tiles[city.position.y][city.position.x];
    production += calculateTileYield(cityTile, players).production;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    production += calculateTileYield(tile, players).production;
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

export function calculateDetailedCityProduction(city: City, map: GameMap, player: Player, players?: Player[]): { 
  total: number, 
  base: number, 
  buildings: number, 
  militaryScience: number, 
  tempBonus: number 
} {
  let base = 0;
  let buildings = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
    const cityTile = map.tiles[city.position.y][city.position.x];
    base += calculateTileYield(cityTile, players).production;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    base += calculateTileYield(tile, players).production;
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

  const total = base + buildings + tempBonus + militaryScience;

  return { total, base, buildings, militaryScience, tempBonus };
}

export function calculateCityTrade(city: City, map: GameMap, players?: Player[]): number {
  let trade = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     trade += calculateTileYield(cityTile, players).trade;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    trade += calculateTileYield(tile, players).trade;
  }

  city.buildings.forEach(b => {
    const def = BUILDINGS[b.type];
    if (def && !def.allowedTerrain) {
         trade += def.effects.tradeBonus;
    }
  });

  return trade;
}

export function calculateCityCulture(city: City, map: GameMap, players?: Player[]): number {
  let culture = 0;

  if (city.position.x >= 0 && city.position.x < map.width && city.position.y >= 0 && city.position.y < map.height) {
     const cityTile = map.tiles[city.position.y][city.position.x];
     culture += calculateTileYield(cityTile, players).culture;
  }

  const surroundingTiles = getCitySurroundingTiles(city, map);
  for (const tile of surroundingTiles) {
    culture += calculateTileYield(tile, players).culture;
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
  
  if (player.government === 'communism') {
      totalProduction += (player.cities.length * 2);
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