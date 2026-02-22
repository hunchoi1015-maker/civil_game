import { Position } from './map';

export type ArmyCardType = 'infantry' | 'artillery' | 'cavalry' | 'airforce'| 'settler';
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
  settler: {
    type: 'settler',
    name: '개척자',
    description: '공격할 줄 모름',
    strongAgainst: null,
    weakAgainst: null
  },
};

// === 전투 타입 ===
export type CombatType = 'field' | 'city' | 'capital';

// === 전장 (Battlefield) ===
export interface BattlefieldResult {
  attackerSurvived: boolean;
  defenderSurvived: boolean;
  attackerDamageDealt: number;
  defenderDamageDealt: number;
  firstStriker: 'attacker' | 'defender' | 'simultaneous';
}

export interface Battlefield {
  id: string;
  attackerCard: ArmyCard | null;
  defenderCard: ArmyCard | null;
  resolved: boolean;
  result: BattlefieldResult | null;
}

// === 배치 상태 ===
export interface PlacementState {
  currentTurn: 'attacker' | 'defender';
  attackerPassed: boolean;
  defenderPassed: boolean;
  attackerDeployCount: number;
  defenderDeployCount: number;
  attackerMaxCards: number;
  defenderMaxCards: number;
}

// === 전리품 ===
export interface LootSelection {
  type: 'trade' | 'culture';
  amount: number;
}

export const LOOT_MAX_PER_SELECTION = 3;
export const CITY_CAPITAL_MAX_CARDS = 6;

// 공격자 카드 제한: 유닛 수 기반 (1→3, 2→5, 3→7)
export function getAttackerMaxCards(unitCount: number): number {
  if (unitCount <= 0) return 1;
  return Math.min(1 + unitCount * 2, 7);
}

// === 전투 로그 ===
export interface CombatLogEntry {
  message: string;
  battlefieldId?: string;
  attackerCard?: string;
  defenderCard?: string;
}

// === 전투 상태 ===
export type CombatPhase = 'placement' | 'resolution' | 'scoring' | 'loot' | 'result';

export interface CombatState {
  isActive: boolean;

  // 원래 이동자/방어자 (역할 교환 전)
  originalMoverId: string | null;
  originalDefenderId: string | null;

  // 현재 전투 역할 (성벽 도시 시 교환될 수 있음)
  attackerRoleId: string | null;
  defenderRoleId: string | null;

  // 전투 컨텍스트
  combatType: CombatType;
  targetTilePosition: Position | null;
  targetCityId: string | null;
  isWalledCity: boolean;
  rolesSwapped: boolean;

  // 카드 풀
  attackerAvailableCards: ArmyCard[];
  defenderAvailableCards: ArmyCard[];

  // 전장
  battlefields: Battlefield[];

  // 배치 상태
  placement: PlacementState;

  // 묘지 (전투 중 사망한 카드)
  graveyard: ArmyCard[];

  // 전투 단계
  phase: CombatPhase;

  // 보너스 (전투 시작 시 계산)
  attackerCombatBonus: number;
  defenderCombatBonus: number;
  defenderCityDefenseBonus: number;
  attackerCityDefenseBonus: number; //역할 변환 고려 

  // 점수 (해결 후 계산)
  attackerFinalScore: number;
  defenderFinalScore: number;

  // 결과
  winner: 'attacker' | 'defender' | null;
  winnerPlayerId: string | null;
  loserPlayerId: string | null;

  // 전리품
  lootSelections: LootSelection[];
  maxLootSelections: number;

  // 자원 능력  (전투)
  usedCombatSkills: string[];
  // 로그
  log: CombatLogEntry[];
}

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

// 전투 점수 계산: 공격력만 합산 + 보너스
export function calculateBattleScore(
  cards: ArmyCard[],
  combatBonus: number,
  cityDefenseBonus: number = 0
): number {
  const cardScore = cards.reduce((sum, card) => sum + card.attack, 0);
  return cardScore + combatBonus + cityDefenseBonus;
}
