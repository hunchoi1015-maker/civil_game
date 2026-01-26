export type ArmyCardType = 'infantry' | 'artillery' | 'cavalry' | 'airforce';
export type ArmyTier = 1 | 2 | 3 | 4;

// 공격력/체력 분리된 부대 카드
export interface ArmyCard {
  id: string;
  type: ArmyCardType;
  tier: ArmyTier;
  attack: number;    // 공격력
  health: number;    // 체력
  maxHealth: number;
  ownerId: string;
  isDeployed: boolean;
  name: string;
}

export interface ArmyCardDefinition {
  type: ArmyCardType;
  name: string;
  description: string;
  strongAgainst: ArmyCardType | null;  // 상성 우위 = 선제공격
  weakAgainst: ArmyCardType | null;
}

// 상성: 보병 → 기병 → 포병 → 보병 (선제공격)
// 공군: 무상성
export const ARMY_CARD_DEFINITIONS: Record<ArmyCardType, ArmyCardDefinition> = {
  infantry: {
    type: 'infantry',
    name: '보병',
    description: '기병에게 선제공격, 포병에게 후제공격',
    strongAgainst: 'cavalry',
    weakAgainst: 'artillery',
  },
  artillery: {
    type: 'artillery',
    name: '포병',
    description: '보병에게 선제공격, 기병에게 후제공격',
    strongAgainst: 'infantry',
    weakAgainst: 'cavalry',
  },
  cavalry: {
    type: 'cavalry',
    name: '기병',
    description: '포병에게 선제공격, 보병에게 후제공격',
    strongAgainst: 'artillery',
    weakAgainst: 'infantry',
  },
  airforce: {
    type: 'airforce',
    name: '공군',
    description: '무상성, 강력한 전투력',
    strongAgainst: null,
    weakAgainst: null,
  },
};

export interface CombatState {
  isActive: boolean;
  attackerId: string | null;
  defenderId: string | null;
  attackerCards: ArmyCard[];
  defenderCards: ArmyCard[];
  attackerDeployed: ArmyCard[];  // 배치된 카드
  defenderDeployed: ArmyCard[];
  round: number;
  maxRounds: number;
  log: CombatLogEntry[];
  phase: 'setup' | 'battle' | 'result';
}

export interface CombatLogEntry {
  round: number;
  message: string;
  attackerCard?: string;
  defenderCard?: string;
  damage: number;
}

export interface CombatResult {
  winner: 'attacker' | 'defender';
  attackerScore: number;
  defenderScore: number;
  lootChoice: 'trade' | 'culture' | null;
}

export interface Loot {
  trade: number;
  culture: number;
}

// 전선 크기: 최대 20장
export const FRONTLINE_SIZE = 20;

// 전리품
export const LOOT_AMOUNT = 3;

// 부대 카드 생성 (공격력/체력 선택)
export function createArmyCard(
  id: string,
  type: ArmyCardType,
  tier: ArmyTier,
  ownerId: string,
  attack: number,
  health: number,
  name: string
): ArmyCard {
  return {
    id,
    type,
    tier,
    attack,
    health,
    maxHealth: health,
    ownerId,
    isDeployed: false,
    name,
  };
}

// 상성 확인 (선제공격 여부)
export function hasFirstStrike(attacker: ArmyCardType, defender: ArmyCardType): boolean {
  const attackerDef = ARMY_CARD_DEFINITIONS[attacker];
  return attackerDef.strongAgainst === defender;
}

// 전투 점수 계산
export function calculateBattleScore(cards: ArmyCard[], combatBonus: number): number {
  const cardScore = cards.reduce((sum, card) => sum + card.attack + card.health, 0);
  return cardScore + combatBonus;
}
