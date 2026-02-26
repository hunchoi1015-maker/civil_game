export type TechLevel = 1 | 2 | 3 | 4 | 5;
export const TECH_COSTS: Record<number, number> = {
          1: 6,
          2: 11,
          3: 16,
          4: 21,
          5: 26
      };


// 자원 소모 능력 (1턴 1회)
export interface TechResourceAbility {
  description: string;
  maxTokens?: number; // 최대 수용 가능한 화폐 토큰 등 제한 (예: 4)
}

// 패시브 및 기타 효과들
export interface TechPassiveEffects {
  movementBonus?: number;
  stackingLimitBonus?: number;
  cultureCardLimitBonus?: number;
  waterMovement?: boolean; // 물 이동 가능
  waterStop?: boolean; // 물에서 이동 마침 가능
  ignoreTerrain?: boolean; // 비행 (지형, 유닛 무시)
}

// 부대 및 건물 개량
export interface TechUpgrade {
  from: string; // 이전 ID (예: 'militia', 'temple')
  to: string;   // 바뀔 ID (예: 'swordsman', 'cathedral')
}

export interface Technology {
  id: string;
  name: string;
  level: TechLevel;
  description: string;
  
  isStartingTechFor?: string; // 고유 시작 국가 (예: 'america')
  
  unlocksBuildings?: string[]; // 해금되는 건물 ID 배열
  upgradesBuilding?: TechUpgrade; // 건물 자동 개량
  
  unlocksUnits?: string[]; // 해금되는 부대 ID
  upgradesUnit?: TechUpgrade; // 부대 자동 개량 (스탯 변화 등은 상수에서 관리)
  
  unlocksGovernment?: string; // 해금되는 정치체제 ID
  
  resourceAbility?: TechResourceAbility; // 액티브 능력
  passiveEffects?: TechPassiveEffects; // 패시브 효과
}

// 플레이어가 실제로 보유하게 될 데이터 형태
export interface PlayerTechnology extends Technology {
  tokensOnCard: number; // 기술 카드에 올려진 화폐 토큰 수
  abilityUsedThisTurn: boolean; // 이번 턴 자원 능력 사용 여부
}