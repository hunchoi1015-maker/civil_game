import { Position, ResourceType } from './map';

export interface City {
  id: string;
  name: string;
  ownerId: string;
  position: Position;
  isCapital: boolean;
  buildings: Building[];
  builtWonders?: string[];
  
  hasWalls: boolean;          // 성벽 건설 여부
  cityDefenseBonus: number;   // 도시 방어 보너스 (기본 + 성벽, 이 도시가 공격받을 때만 적용)
  hasActedThisTurn: boolean;

  hasHarvestedCulture: boolean;
  tempProductionBonus?: number;
  isParalyzed?: boolean;

  actionTypeThisTurn?: 'none' | 'harvest' | 'produce'; 
  usedProductionThisTurn?: number; // 이번 턴에 사용한 생산력
  producedItemsCount?: number;     // 이번 턴에 생산한 물품 개수

  pioneerProductionBonus?: number;
  pioneerTradeBonus?: number;
  pioneerLinkedLuxuries?: ResourceType[];
}

export interface Building {
  id: string;
  type: BuildingType;
  tilePosition?: Position;
}

export type BuildingType =
  | 'walls'
  | 'barracks'
  | 'library'
  | 'market'
  | 'temple'
  | 'university'
  | 'cathedral'
  | 'bank'
  | 'granary'         // 곡물창고
  | 'aqueduct'        // 수로교
  | 'workshop'        // 작업장
  | 'iron_mine'       // 철광
  | 'military_academy'// 사관학교
  | 'trading_post'    // 교역소
  | 'harbor';         // 항구

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  productionCost: number;
  effects: BuildingEffect;
  requiredTech: string | null;
  requiredBuilding: BuildingType | null;
  allowedTerrain: string[] | null;
  maxPerCity: number;
  isWonder?: boolean;
}

export interface BuildingEffect {
  productionBonus: number;
  tradeBonus: number;
  cultureBonus: number;
  combatBonus: number;
  cityDefenseBonus: number;

}

export const MAX_CITIES = 3;
export const MAX_BUILDINGS_PER_CITY = 8;

export const CITY_BASE_DEFENSE_BONUS = 6;
export const CAPITAL_BASE_DEFENSE_BONUS = 12;

export function createCity(
  id: string,
  name: string,
  ownerId: string,
  position: Position,
  isCapital: boolean
): City {
  return {
    id,
    name,
    ownerId,
    position,
    isCapital,
    buildings: [],
    builtWonders: [],
    hasWalls: isCapital,
    cityDefenseBonus: isCapital ? CAPITAL_BASE_DEFENSE_BONUS : CITY_BASE_DEFENSE_BONUS, 
    hasActedThisTurn: false,
    hasHarvestedCulture: false,
    actionTypeThisTurn: 'none',
    usedProductionThisTurn: 0,
    producedItemsCount: 0,
  };
}