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
  combatBonus: number;        // 전투 보너스 (막사 등에서 획득)
  hasWalls: boolean;          // 성벽 건설 여부 (도시당 1개)
  cityDefenseBonus: number;   // 도시 방어 보너스 (성벽에서 획득, 공격받을 때만 적용)
  hasActedThisTurn: boolean;  // 턴당 행동 제한 (건물 건설/유닛 생산/문화 수입 중 1회)
}

export interface Building {
  id: string;
  type: BuildingType;
  isConstructed: boolean;
  tilePosition?: Position;  // 건물이 배치된 타일 위치 (도시 교외 지역)
}

export type BuildingType =
  | 'walls'       // 성벽
  | 'barracks'    // 막사
  | 'library'     // 도서관
  | 'market'      // 시장
  | 'temple'      // 사원
  | 'university'  // 대학교
  | 'cathedral'   // 대성당
  | 'bank';       // 은행

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  productionCost: number;
  effects: BuildingEffect;
  requiredTech: string | null;
  requiredBuilding: BuildingType | null;  // 선행 건물 요구
  allowedTerrain: string[] | null;        // 허용된 지형 (null이면 도시 타일에만)
  maxPerCity: number;                     // 도시당 최대 개수 (성벽은 1개)
}

export interface BuildingEffect {
  productionBonus: number;
  tradeBonus: number;
  cultureBonus: number;
  combatBonus: number;       // 전투 보너스
  cityDefenseBonus: number;  // 도시 방어 보너스 (공격받을 때만 적용)
  techCostReduction: number; // 기술 비용 감소
  currencyPerTurn: number;   // 턴당 화폐 생산
}

export type ProductionItemType = 'unit' | 'building' | 'wonder';

export interface ProductionItem {
  type: ProductionItemType;
  itemId: string;
  name: string;
  cost: number;
}

export const MAX_CITIES = 3;
export const MAX_BUILDINGS_PER_CITY = 8;  // 최대 8개 건물

// 수도 기본 전투 보너스 (내장 성벽)
export const CAPITAL_BASE_COMBAT_BONUS = 6;

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
    combatBonus: isCapital ? CAPITAL_BASE_COMBAT_BONUS : 0,  // 수도는 기본 전투 보너스
    hasWalls: false,
    cityDefenseBonus: 0,      // 도시 방어 보너스 (성벽에서 획득)
    hasActedThisTurn: false,  // 턴당 행동 제한
  };
}
