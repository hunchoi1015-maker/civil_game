import { Player, ArmyCardType, ArmyTier } from '../../types';

export function getPlayerOrder(firstPlayerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    order.push((firstPlayerIndex + i) % playerCount);
  }
  return order;
}

export function findPlayerById(players: Player[], playerId: string): Player | undefined {
  return players.find((p) => p.id === playerId);
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// ============================================================================
// 기술 관련 함수 (새로운 피라미드 기술 시스템 적용 완료)
// ============================================================================

/**
 * 플레이어가 특정 기술을 연구했는지 확인
 */
export function hasTechnology(player: Player, techId: string): boolean {
  return player.technologies.some((tech) => tech.id === techId);
}

/**
 * 피라미드 제약: 특정 레벨의 기술을 연구할 수 있는지 확인 (새로운 공식 적용)
 */
export function canResearchTechLevel(player: Player, level: number): boolean {
  if (level === 1) return true;

  const techCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach((t) => {
    // 시작 기술(isStartingTechFor)은 항상 1레벨로 취급
    const lv = t.isStartingTechFor ? 1 : t.level;
    if (lv >= 1 && lv <= 5) {
      techCounts[lv]++;
    }
  });

  const previousLevel = level - 1;
  // 새로운 피라미드 공식: (N-1)레벨 기술 개수가 N레벨 기술 개수보다 커야 함
  return techCounts[previousLevel] > (techCounts[level] || 0);
}

/**
 * 레벨별 연구된 기술 개수 반환
 */
export function getTechCountsByLevel(player: Player): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach((tech) => {
    const lv = tech.isStartingTechFor ? 1 : tech.level;
    if (lv >= 1 && lv <= 5) {
      counts[lv]++;
    }
  });
  return counts;
}

/**
 * 7.4: 플레이어가 연구한 특정 병과(보병/기병/포병)의 최고 티어 반환
 * (예전 unlocks 대신 새 기술 ID 매핑으로 직관적이고 안전하게 판별합니다)
 */
export function getMaxResearchedTier(player: Player, type: ArmyCardType): ArmyTier {
  let maxTier: ArmyTier = 1;

  // 기획에 맞춘 병과별 진급 기술 매핑 테이블
  const upgradeTechs: Record<string, { type: string, tier: number }> = {
    'democracy': { type: 'infantry', tier: 2 }, // 보병 2단계 (검사)
    'gunpowder': { type: 'infantry', tier: 3 }, // 보병 3단계 (소총병)
    'replaceable_parts': { type: 'infantry', tier: 4 }, // 보병 4단계 (현대보병)
    
    'chivalry': { type: 'cavalry', tier: 2 }, // 기병 2단계 (기사)
    'railroad': { type: 'cavalry', tier: 3 }, // 기병 3단계 (기갑병)
    'combustion': { type: 'cavalry', tier: 4 }, // 기병 4단계 (탱크)
    
    'mathematics': { type: 'artillery', tier: 2 }, // 포병 2단계 (대포)
    'metallurgy': { type: 'artillery', tier: 3 }, // 포병 3단계 (야포)
    'ballistics': { type: 'artillery', tier: 4 }, // 포병 4단계 (로켓포)
  };

  for (const tech of player.technologies) {
    const upgradeInfo = upgradeTechs[tech.id];
    if (upgradeInfo && upgradeInfo.type === type) {
      if (upgradeInfo.tier > maxTier) {
        maxTier = upgradeInfo.tier as ArmyTier;
      }
    }
  }

  return maxTier;
}

/**
 * 7.4: 특정 티어 생산 가능 여부 (하위 티어 생산 제한)
 */
export function canProduceTier(player: Player, type: ArmyCardType, tier: ArmyTier): boolean {
  const maxTier = getMaxResearchedTier(player, type);
  // 최고 티어 이상만 생산 가능하도록 (하위 호환 불가)
  return tier >= maxTier; 
}

/**
 * 7.2: 사용 가능한 교역 자원 계산 (전체 - 화폐)
 */
export function getAvailableTrade(player: Player): number {
  return Math.max(0, player.resources.trade - player.resources.currency);
}