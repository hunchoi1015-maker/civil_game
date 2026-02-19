import { Position } from './map';

export interface City {
  id: string;
  name: string;
  ownerId: string;
  position: Position;
  isCapital: boolean;
  buildings: Building[];
  production: number;
  currentProduction: ProductionItem | null;
  productionProgress: number;
  combatBonus: number;        // 전역 전투 보너스 (예: 막사) - 모든 전투에 합산
  hasWalls: boolean;          // 성벽 건설 여부
  cityDefenseBonus: number;   // 도시 방어 보너스 (기본 + 성벽, 이 도시가 공격받을 때만 적용)
  hasActedThisTurn: boolean;

  hasHarvestedCulture: boolean;
  tempProductionBonus?: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  isConstructed: boolean;
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
  | 'bank';

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
  techCostReduction: number;
  currencyPerTurn: number;
}

export type ProductionItemType = 'unit' | 'building' | 'wonder';

export interface ProductionItem {
  type: ProductionItemType;
  itemId: string;
  name: string;
  cost: number;
}

export const MAX_CITIES = 3;
export const MAX_BUILDINGS_PER_CITY = 8;

// 변경: 일반 도시 기본 방어력
export const CITY_BASE_DEFENSE_BONUS = 6;
// 변경: 수도 기본 방어 보너스 (12로 상향)
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
    production: isCapital ? 3 : 2,
    currentProduction: null,
    productionProgress: 0,
    combatBonus: 0, // 수도 보너스는 이제 defenseBonus로 이동
    hasWalls: isCapital, // 수도는 기본적으로 성벽을 가짐
    // 변경: 수도는 12, 일반 도시는 6으로 초기화
    cityDefenseBonus: isCapital ? CAPITAL_BASE_DEFENSE_BONUS : CITY_BASE_DEFENSE_BONUS, 
    hasActedThisTurn: false,
    hasHarvestedCulture: false,
  };
}