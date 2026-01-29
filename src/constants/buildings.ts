import { BuildingDefinition, BuildingType, TerrainType } from '../types';

// ver3 기준 건물 목록 - 새 정의
export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
  walls: {
    type: 'walls',
    name: '성벽',
    description: '도시 방어 +4. 도시 타일에만 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 0,
      cityDefenseBonus: 4,  // 신규: 도시 방어 보너스
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: null,
    requiredBuilding: null,
    allowedTerrain: ['city'],  // 도시 타일에만
    maxPerCity: 1,
  },
  barracks: {
    type: 'barracks',
    name: '막사',
    description: '교역 +2, 전투 보너스 +2. 물 제외 모든 지형에 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 2,
      cultureBonus: 0,
      combatBonus: 2,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: null,
    requiredBuilding: null,
    allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'],
    maxPerCity: 1,
  },
  library: {
    type: 'library',
    name: '도서관',
    description: '교역 +1, 문화 +1. 숲, 초원에만 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 1,
      cultureBonus: 1,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'writing',
    requiredBuilding: null,
    allowedTerrain: ['forest', 'grassland'],
    maxPerCity: 1,
  },
  university: {
    type: 'university',
    name: '대학교',
    description: '교역 +2, 문화 +2. 숲, 초원에만 건설 가능. (도서관 필요)',
    productionCost: 6,
    effects: {
      productionBonus: 0,
      tradeBonus: 2,
      cultureBonus: 2,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'philosophy',
    requiredBuilding: 'library',
    allowedTerrain: ['forest', 'grassland'],
    maxPerCity: 1,
  },
  market: {
    type: 'market',
    name: '시장',
    description: '생산 +1, 교역 +1, 문화 +1. 물 제외 모든 지형에 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 1,
      tradeBonus: 1,
      cultureBonus: 1,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'currency',
    requiredBuilding: null,
    allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'],
    maxPerCity: 1,
  },
  bank: {
    type: 'bank',
    name: '은행',
    description: '생산 +1, 교역 +1, 문화 +1, 화폐 +1. 물 제외. (시장 필요)',
    productionCost: 6,
    effects: {
      productionBonus: 1,
      tradeBonus: 1,
      cultureBonus: 1,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 1,
    },
    requiredTech: 'banking',
    requiredBuilding: 'market',
    allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'],
    maxPerCity: 1,
  },
  temple: {
    type: 'temple',
    name: '사원',
    description: '문화 +2. 물 제외 모든 지형에 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 2,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'philosophy',
    requiredBuilding: null,
    allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'],
    maxPerCity: 1,
  },
  cathedral: {
    type: 'cathedral',
    name: '대성당',
    description: '문화 +3. 물 제외. (사원 필요)',
    productionCost: 8,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 3,
      combatBonus: 0,
      cityDefenseBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'theology',
    requiredBuilding: 'temple',
    allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'],
    maxPerCity: 1,
  },
};

export function getBuildingDefinition(type: BuildingType): BuildingDefinition {
  return BUILDINGS[type];
}

export function getAvailableBuildings(
  researchedTechs: string[],
  existingBuildings: BuildingType[]
): BuildingDefinition[] {
  return Object.values(BUILDINGS).filter(building => {
    // 이미 건설된 건물은 제외
    if (existingBuildings.includes(building.type)) {
      return false;
    }
    // 기술 요구사항 확인
    if (building.requiredTech && !researchedTechs.includes(building.requiredTech)) {
      return false;
    }
    // 선행 건물 요구사항 확인
    if (building.requiredBuilding && !existingBuildings.includes(building.requiredBuilding)) {
      return false;
    }
    return true;
  });
}

// 도시의 총 전투 보너스 계산
export function calculateCityCombatBonus(buildings: BuildingType[], isCapital: boolean): number {
  let bonus = isCapital ? 6 : 0;  // 수도 기본 보너스

  for (const buildingType of buildings) {
    bonus += BUILDINGS[buildingType].effects.combatBonus;
  }

  return bonus;
}

// 도시의 기술 비용 감소 계산
export function calculateTechCostReduction(buildings: BuildingType[]): number {
  let reduction = 0;

  for (const buildingType of buildings) {
    reduction += BUILDINGS[buildingType].effects.techCostReduction;
  }

  return reduction;
}

// 도시의 도시 방어 보너스 계산 (공격받을 때만 적용)
export function calculateCityDefenseBonus(buildings: BuildingType[]): number {
  let bonus = 0;

  for (const buildingType of buildings) {
    bonus += BUILDINGS[buildingType].effects.cityDefenseBonus;
  }

  return bonus;
}
