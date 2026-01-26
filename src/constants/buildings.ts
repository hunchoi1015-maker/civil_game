import { BuildingDefinition, BuildingType } from '../types';

// QA ver1 기준 건물 목록
export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
  walls: {
    type: 'walls',
    name: '성벽',
    description: '도시 방어력 강화. 도시당 1개만 건설 가능.',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 4,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: null,
    requiredBuilding: null,
    allowedTerrain: null,  // 도시 타일에만
    maxPerCity: 1,
  },
  barracks: {
    type: 'barracks',
    name: '막사',
    description: '군사 훈련 시설. 전투 보너스 +2',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 2,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: null,
    requiredBuilding: null,
    allowedTerrain: null,
    maxPerCity: 1,
  },
  library: {
    type: 'library',
    name: '도서관',
    description: '지식 축적. 기술 비용 -1',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 0,
      techCostReduction: 1,
      currencyPerTurn: 0,
    },
    requiredTech: 'writing',
    requiredBuilding: null,
    allowedTerrain: null,
    maxPerCity: 1,
  },
  market: {
    type: 'market',
    name: '시장',
    description: '교역 활성화. 교역 +2',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 2,
      cultureBonus: 0,
      combatBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'currency',
    requiredBuilding: null,
    allowedTerrain: null,
    maxPerCity: 1,
  },
  temple: {
    type: 'temple',
    name: '사원',
    description: '종교와 문화의 중심지. 문화 +2',
    productionCost: 4,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 2,
      combatBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'philosophy',
    requiredBuilding: null,
    allowedTerrain: null,
    maxPerCity: 1,
  },
  university: {
    type: 'university',
    name: '대학교',
    description: '고급 교육 기관. 기술 비용 -2 (도서관 필요)',
    productionCost: 6,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 0,
      techCostReduction: 2,
      currencyPerTurn: 0,
    },
    requiredTech: 'philosophy',
    requiredBuilding: 'library',
    allowedTerrain: null,
    maxPerCity: 1,
  },
  cathedral: {
    type: 'cathedral',
    name: '대성당',
    description: '웅장한 종교 건축물. 문화 +4 (사원 필요)',
    productionCost: 8,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 4,
      combatBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 0,
    },
    requiredTech: 'theology',
    requiredBuilding: 'temple',
    allowedTerrain: null,
    maxPerCity: 1,
  },
  bank: {
    type: 'bank',
    name: '은행',
    description: '금융의 중심지. 턴당 화폐 +1 (시장 필요)',
    productionCost: 6,
    effects: {
      productionBonus: 0,
      tradeBonus: 0,
      cultureBonus: 0,
      combatBonus: 0,
      techCostReduction: 0,
      currencyPerTurn: 1,
    },
    requiredTech: 'banking',
    requiredBuilding: 'market',
    allowedTerrain: null,
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
