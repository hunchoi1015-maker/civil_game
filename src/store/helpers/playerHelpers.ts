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
// 기술 관련 함수 추가 (7.2, 7.4, 7.6 구현용)
// ============================================================================

/**
 * 플레이어가 특정 기술을 연구했는지 확인
 */
export function hasTechnology(player: Player, techId: string): boolean {
  return player.technologies.some((tech) => tech.id === techId);
}

/**
 * 피라미드 제약: 특정 레벨의 기술을 연구할 수 있는지 확인
 * N레벨 연구를 위해 (N-1)레벨 기술을 N-1개 이상 연구해야 함
 */
export function canResearchTechLevel(player: Player, level: number): boolean {
  if (level === 1) return true;

  const techCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach((t) => {
    if (t.level >= 1 && t.level <= 5) {
      techCounts[t.level]++;
    }
  });

  const previousLevel = level - 1;
  const requiredCount = level - 1;

  return techCounts[previousLevel] >= requiredCount;
}

/**
 * 레벨별 연구된 기술 개수 반환
 */
export function getTechCountsByLevel(player: Player): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach((tech) => {
    if (tech.level >= 1 && tech.level <= 5) {
      counts[tech.level]++;
    }
  });
  return counts;
}

/**
 * 7.4: 플레이어가 연구한 특정 타입의 최고 티어 반환
 */
export function getMaxResearchedTier(player: Player, type: ArmyCardType): ArmyTier {
  let maxTier: ArmyTier = 1;

  for (const tech of player.technologies) {
    const armyTierUnlocks = tech.unlocks?.filter((u) => u.type === 'armyTier') || [];

    for (const unlock of armyTierUnlocks) {
      const parts = unlock.id.split('_');
      if (parts.length === 2 && parts[0] === type) {
        const tier = parseInt(parts[1]) as ArmyTier;
        if (tier > maxTier) {
          maxTier = tier;
        }
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
  return tier >= maxTier;
}

/**
 * 7.2: 사용 가능한 교역 자원 계산 (전체 - 화폐)
 */
export function getAvailableTrade(player: Player): number {
  return Math.max(0, player.resources.trade - player.resources.currency);
}