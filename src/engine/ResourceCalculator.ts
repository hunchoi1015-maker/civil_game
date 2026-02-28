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
      // (현재 불가사의는 문화만 주지만, 나중에 생산/교역이 추가된다면 아래 0을 변수로 바꿔주세요)
      production = 0; 
      trade = 0;
      culture = wonderDef.cultureProduction;
    }
  }
  // 🌟 3순위: 건물이 있다면? 건물 스탯으로 덮어쓰기! (기존 로직 동일)
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
// 플레이어 총 교역량 (민주주의 +2, 근본주의 -2 적용)
export function calculatePlayerTrade(player: Player, map: GameMap): number {
  let totalTrade = 0;
  for (const city of player.cities) {
    totalTrade += calculateCityTrade(city, map);
  }
  
  // 🌟 [새로운 기획 반영] 체제별 실시간 증감 (체제가 바뀌면 즉각 교체됨!)
  if (player.government === 'democracy') totalTrade += 2;
  if (player.government === 'fundamentalism') totalTrade -= 2;
  
  return Math.max(0, totalTrade); // 교역량이 마이너스가 되지 않도록 방어
}

// 플레이어 총 생산량 (공산주의 모든 도시 +2 적용)
export function calculatePlayerProduction(player: Player, map: GameMap): number {
  let totalProduction = 0;
  for (const city of player.cities) {
    totalProduction += calculateCityProduction(city, map);
  }
  
  // 🌟 [새로운 기획 반영] 공산주의 채택 시 보유한 도시 개수만큼 2씩 추가!
  if (player.government === 'communism') {
      totalProduction += (player.cities.length * 2);
  }

  // 기존 군사학 패시브 유지
  if (player.technologies.some(t => t.id === 'military_science')) {
    totalProduction += Math.floor(player.resources.currency / 3);
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