// src/types/nation.ts

// 국가 시스템
export type NationType = 'america' | 'rome' | 'egypt' | 'china' | 'russia' | 'germany';

export interface Nation {
  id: NationType;
  name: string;
  description: string;
  startingBonus: NationStartingBonus;
  specialAbility: NationSpecialAbility;
  color: string;
  flag: string;
}

// 시작 보너스
export interface NationStartingBonus {
  greatPeople?: number;              // 위인 개수
  unlockedTechs: string[];           // 해금된 기술 ID 목록
  startingGovernment: string;        // 시작 정치체제
  extraMilitaryUnits?: number;       // 추가 군사 유닛
  armyCards?: ArmyCardBonus[];       // 시작 부대 카드
  hasWalls?: boolean;                // 수도 성벽 여부
  wonderCards?: number;              // 불가사의 카드 개수
  militaryLimit?: number;            // 군사 유닛 제한 (기본 6)
  stackingLimitBonus?: number;       // 배치 제한 보너스
}

export interface ArmyCardBonus {
  type: 'infantry' | 'cavalry' | 'artillery' | 'airforce';
  tier: 1 | 2 | 3 | 4;
  count: number;
}

// 특수 능력
export interface NationSpecialAbility {
  type: 'trade_to_production' | 'culture_on_events' | 'free_building' | 'village_culture' | 'tech_steal' | 'free_army_on_research';
  description: string;
  tradeToProductionRatio?: number;   // 교역 3당 생산력 (미국 2, 기타 1)
  
  cultureEvents?: {
    villageDefeat?: number;          // 마을 전투 승리 시 문화
    cityFound?: number;              // 도시 건설 시 문화
    wonderBuild?: number;            // 불가사의 건설 시 문화
    cityDestroy?: number;            // 도시 파괴 시 문화
  };
  
  freeBuildingPerTurn?: boolean;     // 매 턴 1회 무료 건물
  villageCulture?: number;           // 마을/오두막 획득 시 문화
  canStealTech?: boolean;            // 유닛 소모로 기술 복사
  armyCardOnTechResearch?: boolean;  // 부대 진급 기술 연구 시 카드 획득
}

export const NATIONS: Record<NationType, Nation> = {
  america: {
    id: 'america',
    name: '미국',
    description: '자유의 나라. 생산력 전환 효율이 높습니다.',
    startingBonus: {
      greatPeople: 1,
      unlockedTechs: ['currency'],  
      startingGovernment: 'despotism',
    },
    specialAbility: {
      type: 'trade_to_production',
      description: '도시경영 단계에서 교역 3 → 생산력 2 (1턴 반복 가능)',
      tradeToProductionRatio: 2,
    },
    color: '#3B82F6',
    flag: '🇺🇸',
  },
  
  rome: {
    id: 'rome',
    name: '로마',
    description: '영원한 제국. 확장과 건설로 문화를 얻습니다.',
    startingBonus: {
      unlockedTechs: ['code_of_laws'], 
      startingGovernment: 'despotism',
    },
    specialAbility: {
      type: 'culture_on_events',
      description: '마을 승리/도시 건설/불가사의 건설/도시 파괴 시 문화 트랙 +1.',
      tradeToProductionRatio: 1,
      cultureEvents: {
        villageDefeat: 1,
        cityFound: 1,
        wonderBuild: 1,
        cityDestroy: 1,
      },
    },
    color: '#DC2626',
    flag: '🏛️',
  },
  
  egypt: {
    id: 'egypt',
    name: '이집트',
    description: '고대의 신비. 건물을 무료로 건설할 수 있습니다.',
    startingBonus: {
      wonderCards: 1,
      unlockedTechs: ['construction'], 
      startingGovernment: 'despotism',
    },
    specialAbility: {
      type: 'free_building',
      description: '매 턴 1회 해금된 건물을 생산력 없이 건설 가능. 교역 3 → 생산력 1',
      tradeToProductionRatio: 1,
      freeBuildingPerTurn: true,
    },
    color: '#F59E0B',
    flag: '🏺',
  },
  
  china: {
    id: 'china',
    name: '중국',
    description: '만리장성의 나라. 마을 탐험에 특화되어 있습니다.',
    startingBonus: {
      hasWalls: true,
      unlockedTechs: ['writing'],  // 🌟 [수정] pottery에서 writing(기록)으로 변경
      startingGovernment: 'despotism',
    },
    specialAbility: {
      type: 'village_culture',
      description: '오두막/마을 획득 시 문화 +3',
      tradeToProductionRatio: 1,
      villageCulture: 3,
    },
    color: '#EF4444',
    flag: '🐉',
  },
  
  russia: {
    id: 'russia',
    name: '러시아',
    description: '광활한 대지. 강력한 군사력과 기술 도용 능력.',
    startingBonus: {
      extraMilitaryUnits: 1,
      militaryLimit: 7,
      stackingLimitBonus: 1,
      unlockedTechs: ['communism'],  // 🌟 [수정] communism_tech에서 communism으로 올바르게 수정
      startingGovernment: 'communism',
    },
    specialAbility: {
      type: 'tech_steal',
      description: '유닛 소모로 적 기술 복사 가능.',
      tradeToProductionRatio: 1,
      canStealTech: true,
    },
    color: '#1D4ED8',
    flag: '🐻',
  },
  
  germany: {
    id: 'germany',
    name: '독일',
    description: '공학의 나라. 부대 진급 기술 연구 시 카드를 얻습니다.',
    startingBonus: {
      armyCards: [
        { type: 'infantry', tier: 1, count: 2 }
      ],
      unlockedTechs: ['metal_casting'],  // 🌟 [수정] iron_working에서 metal_casting으로 올바르게 수정
      startingGovernment: 'despotism',
    },
    specialAbility: {
      type: 'free_army_on_research',
      description: '부대 진급 기술 연구 시 해당 카드 1장 획득.',
      tradeToProductionRatio: 1,
      armyCardOnTechResearch: true,
    },
    color: '#1F2937',
    flag: '⚙️',
  },
};

export function getNation(id: NationType): Nation {
  return NATIONS[id];
}

export function getAllNations(): Nation[] {
  return Object.values(NATIONS);
}

export function getTradeToProductionRatio(nationId: NationType): number {
  const nation = NATIONS[nationId];
  return nation.specialAbility.tradeToProductionRatio || 1;
}

export function getCultureOnEvent(
  nationId: NationType, 
  eventType: 'villageDefeat' | 'cityFound' | 'wonderBuild' | 'cityDestroy'
): number {
  const nation = NATIONS[nationId];
  if (nation.specialAbility.type !== 'culture_on_events') return 0;
  return nation.specialAbility.cultureEvents?.[eventType] || 0;
}

export function canBuildFreeBuilding(nationId: NationType): boolean {
  const nation = NATIONS[nationId];
  return nation.specialAbility.freeBuildingPerTurn === true;
}

export function getVillageCultureBonus(nationId: NationType): number {
  const nation = NATIONS[nationId];
  if (nation.specialAbility.type !== 'village_culture') return 0;
  return nation.specialAbility.villageCulture || 0;
}

export function canStealTech(nationId: NationType): boolean {
  const nation = NATIONS[nationId];
  return nation.specialAbility.canStealTech === true;
}

export function canGetArmyCardOnResearch(nationId: NationType): boolean {
  const nation = NATIONS[nationId];
  return nation.specialAbility.armyCardOnTechResearch === true;
}