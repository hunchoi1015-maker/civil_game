import { BuildingDefinition, BuildingType } from '../types';

// 🌟 [추가] 단종되는 건물 매핑 (하위 건물 -> 상위 건물을 해금하는 기술)
const OBSOLETE_TECH_MAP: Partial<Record<BuildingType, string>> = {
  'granary': 'engineering',      // 공학 개발 시 곡물창고 단종
  'temple': 'theology',          // 신학 개발 시 사원 단종
  'workshop': 'railroad',        // 철도 개발 시 작업장 단종
  'market': 'finance',           // 금융 개발 시 시장 단종
  'barracks': 'military_science', // 군사학 개발 시 막사 단종
  'library': 'printing_press'    // 인쇄기 개발 시 도서관 단종
};

export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
  // === [1차 건물들] ===
  walls: { type: 'walls', name: '성벽', description: '도시 방어 +4', productionCost: 7, effects: { productionBonus: 0, tradeBonus: 0, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 4, }, requiredTech: 'masonry', requiredBuilding: null, allowedTerrain: ['city'], maxPerCity: 1, isSpecialty: false },
  barracks: { type: 'barracks', name: '막사', description: '교역 +2, 전투 보너스 +2', productionCost: 7, effects: { productionBonus: 0, tradeBonus: 2, cultureBonus: 0, combatBonus: 2, cityDefenseBonus: 0, }, requiredTech: 'metal_casting', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'], maxPerCity: 1, isSpecialty: true },
  library: { type: 'library', name: '도서관', description: '교역 +1, 문화 +1', productionCost: 5, effects: { productionBonus: 0, tradeBonus: 1, cultureBonus: 1, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'writing', requiredBuilding: null, allowedTerrain: ['forest', 'grassland'], maxPerCity: 99, isSpecialty: false },
  market: { type: 'market', name: '시장', description: '생산 +1, 교역 +1, 문화 +1', productionCost: 7, effects: { productionBonus: 1, tradeBonus: 1, cultureBonus: 1, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'currency', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'], maxPerCity: 1, isSpecialty: true },
  temple: { type: 'temple', name: '사원', description: '문화 +2', productionCost: 7, effects: { productionBonus: 0, tradeBonus: 0, cultureBonus: 2, combatBonus: 0, cityDefenseBonus: 0,}, requiredTech: 'philosophy', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'], maxPerCity: 1, isSpecialty: true },
  granary: { type: 'granary', name: '곡물창고', description: '생산 +1 교역 +1', productionCost: 5, effects: { productionBonus: 1, tradeBonus: 1, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'pottery', requiredBuilding: null, allowedTerrain: ['grassland', 'forest'], maxPerCity: 99, isSpecialty: false },
  workshop: { type: 'workshop', name: '작업장', description: '생산 +3', productionCost: 7, effects: { productionBonus: 1, tradeBonus: 0, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0,  }, requiredTech: 'construction', requiredBuilding: null, allowedTerrain: ['grassland', 'mountain',], maxPerCity: 99, isSpecialty: false },
  trading_post: { type: 'trading_post', name: '교역소', description: '교역 +1', productionCost: 7, effects: { productionBonus: 0, tradeBonus: 1, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0,}, requiredTech: 'code_of_laws', requiredBuilding: null, allowedTerrain: [ 'desert', ], maxPerCity: 99, isSpecialty: false },
  harbor: { type: 'harbor', name: '항구', description: '생산 +1, 교역 +2', productionCost: 7, effects: { productionBonus: 1, tradeBonus: 2, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0,  }, requiredTech: 'sailing', requiredBuilding: null, allowedTerrain: ['water',  ], maxPerCity: 99, isSpecialty: false },

  // === [2차 진화 건물들] ===
  university: { type: 'university', name: '대학교', description: '교역 +2, 문화 +2', productionCost: 6, effects: { productionBonus: 0, tradeBonus: 2, cultureBonus: 2, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'printing_press', requiredBuilding: null, allowedTerrain: ['forest', 'grassland'], maxPerCity: 99, isSpecialty: false },
  bank: { type: 'bank', name: '은행', description: '생산 +1, 교역 +1, 문화 +1, 화폐 +1', productionCost: 6, effects: { productionBonus: 1, tradeBonus: 1, cultureBonus: 1, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'finance', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'], maxPerCity: 1, isSpecialty: true },
  cathedral: { type: 'cathedral', name: '대성당', description: '문화 +3', productionCost: 8, effects: { productionBonus: 0, tradeBonus: 0, cultureBonus: 3, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'theology', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert'], maxPerCity: 1, isSpecialty: true },
  aqueduct: { type: 'aqueduct', name: '수로교', description: '생산 +2 교역 +2. (곡물창고 개량)', productionCost: 6, effects: { productionBonus: 2, tradeBonus: 2, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0,}, requiredTech: 'engineering', requiredBuilding: null, allowedTerrain: ['grassland', 'forest'], maxPerCity: 99, isSpecialty: false },
  iron_mine: { type: 'iron_mine', name: '철광', description: '생산 +4. (작업장 개량)', productionCost: 6, effects: { productionBonus: 3, tradeBonus: 0, cultureBonus: 0, combatBonus: 0, cityDefenseBonus: 0, }, requiredTech: 'railroad', requiredBuilding: null, allowedTerrain: ['mountain',], maxPerCity: 99, isSpecialty: false },
  military_academy: { type: 'military_academy', name: '사관학교', description: '전투 보너스 +4. (막사 개량)', productionCost: 8, effects: { productionBonus: 0, tradeBonus: 0, cultureBonus: 0, combatBonus: 4, cityDefenseBonus: 0, }, requiredTech: 'military_science', requiredBuilding: null, allowedTerrain: ['grassland', 'forest', 'mountain', 'desert', ], maxPerCity: 1, isSpecialty: true },
};

export function getAvailableBuildings(
  researchedTechs: string[],
  existingBuildings: BuildingType[]
): BuildingDefinition[] {
  return Object.values(BUILDINGS).filter(building => {
    // 🌟 [수정] 일반 건물(max: 99)은 무제한 건설 허용. 특성화/성벽 등 max 1인 건물만 중복 검사
    if (building.maxPerCity === 1 && existingBuildings.includes(building.type)) return false;
    
    if (building.requiredTech && !researchedTechs.includes(building.requiredTech)) return false;
    if (building.requiredBuilding && !existingBuildings.includes(building.requiredBuilding)) return false;

    const obsoleteTech = OBSOLETE_TECH_MAP[building.type];
    if (obsoleteTech && researchedTechs.includes(obsoleteTech)) return false;

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

// 도시의 도시 방어 보너스 계산 (공격받을 때만 적용)
export function calculateCityDefenseBonus(buildings: BuildingType[]): number {
  let bonus = 0;

  for (const buildingType of buildings) {
    bonus += BUILDINGS[buildingType].effects.cityDefenseBonus;
  }

  return bonus;
}
