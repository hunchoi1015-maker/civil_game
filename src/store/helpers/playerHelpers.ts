import { Player, ArmyCardType, ArmyTier ,Tile,ResourceType } from '../../types';

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
    const lv = (t.isStartingTechFor === player.nation) ? 1 : t.level;
    if (lv >= 1 && lv <= 5) {
      techCounts[lv]++;
    }
  });

  const previousLevel = level - 1;
  // 🌟 수정: 하위 레벨 개수가 (상위 레벨 개수 + 2) 이상이어야 함!
  return techCounts[previousLevel] >= (techCounts[level] || 0) + 2;
}

/**
 * 레벨별 연구된 기술 개수 반환
 */
export function getTechCountsByLevel(player: Player): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach((tech) => {
    // 🌟 변경점: 내 국가일 때만 1레벨로 취급!
    const lv = (tech.isStartingTechFor === player.nation) ? 1 : tech.level;
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

export function getPlayerPassives(player: Player) {
  let maxMovement = 2; // 기본 이동력 2
  let stackingLimitBonus = 0;
  let cultureCardLimitBonus = 0;
  let waterMovement = false;
  let waterStop = false;
  let ignoreTerrain = false;

  player.technologies.forEach((tech) => {
    if (tech.passiveEffects) {
      // 1. 이동력 (가장 높은 보너스를 적용. 승마(+1)=3, 항해(+2)=4, 증기(+3)=5, 비행(+4)=6)
      if (tech.passiveEffects.movementBonus) {
        maxMovement = Math.max(maxMovement, 2 + tech.passiveEffects.movementBonus);
      }
      // 2. 배치 제한 (스태킹) 누적
      if (tech.passiveEffects.stackingLimitBonus) {
        stackingLimitBonus += tech.passiveEffects.stackingLimitBonus;
      }
      // 3. 이벤트 카드 보유 한도 누적
      if (tech.passiveEffects.cultureCardLimitBonus) {
        cultureCardLimitBonus += tech.passiveEffects.cultureCardLimitBonus;
      }
      // 4. 지형 이동 제약 해제
      if (tech.passiveEffects.waterMovement) waterMovement = true;
      if (tech.passiveEffects.waterStop) waterStop = true;
      if (tech.passiveEffects.ignoreTerrain) ignoreTerrain = true;
    }
  });

  return { 
    maxMovement, 
    stackingLimitBonus, 
    cultureCardLimitBonus, 
    waterMovement, 
    waterStop, 
    ignoreTerrain 
  };
}

/**
 * 플레이어가 해금한 정치체제 목록 반환
 */
export function getUnlockedGovernments(player: Player): string[] {
  const unlocked = ['despotism']; // 전제군주제는 기본
  player.technologies.forEach((tech) => {
    if (tech.unlocksGovernment) unlocked.push(tech.unlocksGovernment);
  });
  return unlocked;
}

/**
 * 🌟 [통합] 문화 이벤트 카드 보유 한도 계산기
 */
export function getCultureCardLimit(player: Player): number {
  let limit = 2; // 기본 한도

  if (hasTechnology(player, 'pottery')) limit += 1;
  if (hasTechnology(player, 'civil_service')) limit += 1;
  if (hasTechnology(player, 'theology')) limit += 1;
  if (hasTechnology(player, 'computers')) {
    limit += Math.floor((player.resources.currency || 0) / 5);
  }
  if (player.government === 'monarchy') limit += 1;

  return limit;
}

/**
 * 🌟 [통합] 부대 카드 사용 한도 보너스 계산기
 */
export function getCombatCardBonus(player: Player): number {
  let bonus = 0;
  if (player.government === 'fundamentalism') bonus += 1;
  if (hasTechnology(player, 'computers')) {
    bonus += Math.floor((player.resources.currency || 0) / 5);
  }
  return bonus;
}
// 불가사의 활성화(봉쇄 및 무효화) 검사기
export function isWonderActive(tile: Tile, players: Player[]): boolean {
  if (!tile.wonder || !tile.ownerId) return false;

  // 1. 무효화(Invalidated) 검사 - 화약/군주제로 능력이 영구 파괴되었는가?
  const owner = players.find(p => p.id === tile.ownerId);
  if (owner && owner.invalidatedWonders?.includes(tile.wonder.type)) {
    return false;
  }

  // 2. 봉쇄(Blockade) 검사 - 적 유닛이 타일을 밟고 있는가?
  const hasEnemyUnit = players.some(p =>
    p.id !== tile.ownerId && p.units.some(u => tile.unitIds.includes(u.id))
  );
  if (hasEnemyUnit) {
    return false;
  }

  return true; // 무효화도 안됐고, 적 유닛도 없으면 정상 작동!
}


 // 플레이어가 특정 불가사의를 '정상적으로(봉쇄되지 않고)' 소유 중인지 한 번에 확인합니다.

export function hasActiveWonder(playerId: string, wonderType: string, map: any, players: Player[]): boolean {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      // 맵을 뒤져서 내 불가사의를 찾았고, 그게 봉쇄되지도 않았다면 true 반환!
      if (tile.ownerId === playerId && tile.wonder && tile.wonder.type === wonderType) {
        if (isWonderActive(tile, players)) {
          return true;
        }
      }
    }
  }
  return false;
}

// 모든 자원(일반+비밀)의 총합을 계산합니다.
export function getTotalLuxuryResource(player: Player, resourceType: Exclude<ResourceType, 'none'>): number {
  const normal = player.luxuryResources[resourceType] || 0;
  const secret = player.secretResources?.filter(r => r.type === resourceType).length || 0;
  return normal + secret;
}

export function hasEnoughLuxuryResource(player: Player, resourceType: Exclude<ResourceType, 'none'>, amount: number): boolean {
  return getTotalLuxuryResource(player, resourceType) >= amount;
}

// 자원 지불 로직 (일반 우선 -> 시장 반환 / 비밀 차순 -> 영구 소멸)
export function consumeLuxuryResource(
  player: Player,
  market: Record<Exclude<ResourceType, 'none'>, number>,
  resourceType: Exclude<ResourceType, 'none'>,
  amount: number
): boolean {
  let remaining = amount;
  
  // 1. 일반 자원 먼저 소모 (쓴 만큼 시장에 +1 반환)
  const normalAvailable = player.luxuryResources[resourceType] || 0;
  const normalToConsume = Math.min(normalAvailable, remaining);
  if (normalToConsume > 0) {
    player.luxuryResources[resourceType] -= normalToConsume;
    market[resourceType] += normalToConsume; // 🌟 시장으로 돌아감!
    remaining -= normalToConsume;
  }

  // 2. 일반 자원이 부족하면 비밀 자원을 찢어서 소모 (영구 증발, 반환 안 함!)
  if (remaining > 0 && player.secretResources) {
    for (let i = player.secretResources.length - 1; i >= 0; i--) {
      if (player.secretResources[i].type === resourceType) {
        player.secretResources.splice(i, 1); // 🌟 배열에서 영구 삭제
        remaining -= 1;
        if (remaining <= 0) break;
      }
    }
  }

  return remaining === 0;
}
