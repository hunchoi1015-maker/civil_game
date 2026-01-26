import { GameState, GamePhase, Player, WinCondition } from '../types';

export interface PhaseAction {
  type: string;
  playerId: string;
  payload: unknown;
}

export interface PhaseResult {
  success: boolean;
  message?: string;
  nextPhase?: GamePhase;
}

const PHASE_ORDER: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];

export function getNextPhase(currentPhase: GamePhase): GamePhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

export function getPreviousPhase(currentPhase: GamePhase): GamePhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex <= 0) {
    return null;
  }
  return PHASE_ORDER[currentIndex - 1];
}

export function getPhaseDisplayName(phase: GamePhase): string {
  const names: Record<GamePhase, string> = {
    start: '차례 시작',
    trade: '교역',
    cityManagement: '도시 경영',
    movement: '이동',
    research: '연구',
  };
  return names[phase];
}

export function getPhaseDescription(phase: GamePhase): string {
  const descriptions: Record<GamePhase, string> = {
    start: '정치체제 변경, 새 도시 건설을 할 수 있습니다.',
    trade: '자원을 교환하고 교역 토큰을 얻습니다.',
    cityManagement: '건물을 건설하고 유닛을 생산합니다.',
    movement: '유닛을 이동시키고 전투를 수행합니다.',
    research: '기술을 연구합니다.',
  };
  return descriptions[phase];
}

export function isSimultaneousPhase(phase: GamePhase): boolean {
  // 교역만 동시 진행, 연구는 순차 진행 (완료 후 결과 공개)
  return phase === 'trade';
}

export function canPlayerActInPhase(
  phase: GamePhase,
  playerIndex: number,
  currentPlayerIndex: number,
  phaseComplete: boolean[]
): boolean {
  if (isSimultaneousPhase(phase)) {
    // 동시 진행 단계에서는 완료하지 않은 플레이어만 행동 가능
    return !phaseComplete[playerIndex];
  }
  // 순차 진행 단계에서는 현재 플레이어만 행동 가능
  return playerIndex === currentPlayerIndex;
}

export function checkPhaseComplete(
  phase: GamePhase,
  phaseComplete: boolean[],
  _playerCount: number
): boolean {
  if (isSimultaneousPhase(phase)) {
    return phaseComplete.every((complete) => complete);
  }
  // 순차 단계에서는 마지막 플레이어가 완료하면 단계 완료
  return phaseComplete.every((complete) => complete);
}

// QA ver1: 새로운 건물 시스템에 맞게 수정
export function calculateTradeIncome(player: Player): number {
  let income = 0;

  // 도시별 교역 수입
  for (const city of player.cities) {
    income += city.isCapital ? 3 : 2;

    // 건물 보너스 (새 건물 목록)
    for (const building of city.buildings) {
      if (building.type === 'market') income += 2;
      if (building.type === 'bank') income += 1;  // 턴당 화폐가 아닌 교역 보너스
    }
  }

  // 정치체제 보너스
  if (player.government === 'democracy') income += 3;
  if (player.government === 'republic') income += 1;
  if (player.government === 'communism') income -= 1;

  return Math.max(0, income);
}

export function calculateProductionCapacity(player: Player): number {
  let production = 0;

  for (const city of player.cities) {
    production += city.production;
    // 새 건물 시스템에서는 별도의 생산 보너스 건물 없음
  }

  // 정치체제 보너스
  if (player.government === 'monarchy') production += 2;
  if (player.government === 'communism') production += 3;
  if (player.government === 'republic') production += 1;

  return production;
}

export function calculateCultureIncome(player: Player): number {
  let culture = 0;

  for (const city of player.cities) {
    // 건물 보너스 (새 건물 목록)
    for (const building of city.buildings) {
      if (building.type === 'temple') culture += 2;
      if (building.type === 'cathedral') culture += 4;
    }
  }

  return culture;
}

// 도시의 기술 비용 감소 계산
export function calculateTechCostReduction(player: Player): number {
  let reduction = 0;

  for (const city of player.cities) {
    for (const building of city.buildings) {
      if (building.type === 'library') reduction += 1;
      if (building.type === 'university') reduction += 2;
    }
  }

  return reduction;
}

// 도시의 전투 보너스 계산
export function calculateCityCombatBonus(player: Player): number {
  let bonus = 0;

  for (const city of player.cities) {
    bonus += city.combatBonus;
  }

  return bonus;
}

export function checkVictoryConditions(state: GameState): {
  winner: string | null;
  condition: WinCondition | null;
} {
  for (const player of state.players) {
    if (player.isEliminated) continue;

    // 과학 승리
    if (player.technologies.some((t) => t.id === 'space_flight')) {
      return { winner: player.id, condition: 'science' };
    }

    // 경제 승리
    if (player.resources.currency >= 15) {
      return { winner: player.id, condition: 'economic' };
    }

    // 문화 승리
    if (player.cultureTrack >= 20) {
      return { winner: player.id, condition: 'culture' };
    }
  }

  // 군사 승리
  const activePlayers = state.players.filter((p) => !p.isEliminated);
  if (activePlayers.length === 1) {
    return { winner: activePlayers[0].id, condition: 'military' };
  }

  return { winner: null, condition: null };
}

export function getWinConditionName(condition: WinCondition): string {
  const names: Record<WinCondition, string> = {
    science: '과학 승리',
    culture: '문화 승리',
    military: '군사 승리',
    economic: '경제 승리',
  };
  return names[condition];
}

export function getWinConditionDescription(condition: WinCondition): string {
  const descriptions: Record<WinCondition, string> = {
    science: '우주 비행 기술을 연구하여 우주 시대를 열었습니다!',
    culture: '문화 트랙을 완료하여 문화 대국이 되었습니다!',
    military: '모든 적의 수도를 정복하여 세계를 지배했습니다!',
    economic: '15개의 화폐를 모아 경제 대국이 되었습니다!',
  };
  return descriptions[condition];
}
