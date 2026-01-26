import {
  ArmyCard,
  CombatResult,
  CombatLogEntry,
  ArmyCardType,
  FRONTLINE_SIZE,
  hasFirstStrike,
  calculateBattleScore,
} from '../types';

export interface CombatSetup {
  attackerCards: ArmyCard[];
  defenderCards: ArmyCard[];
  attackerBonus: number;  // 도시 전투 보너스
  defenderBonus: number;
}

export interface RoundResult {
  attackerDamageDealt: number;
  defenderDamageDealt: number;
  attackerLosses: ArmyCard[];
  defenderLosses: ArmyCard[];
  log: CombatLogEntry;
}

export function resolveCombat(setup: CombatSetup): CombatResult {
  const attackerCards = JSON.parse(JSON.stringify(setup.attackerCards)) as ArmyCard[];
  const defenderCards = JSON.parse(JSON.stringify(setup.defenderCards)) as ArmyCard[];
  const log: CombatLogEntry[] = [];
  let round = 0;
  const maxRounds = 5;

  while (attackerCards.length > 0 && defenderCards.length > 0 && round < maxRounds) {
    round++;

    // 전선 구성 (최대 20장)
    const attackerFrontline = attackerCards.slice(0, FRONTLINE_SIZE);
    const defenderFrontline = defenderCards.slice(0, FRONTLINE_SIZE);

    // 라운드 해결
    const roundResult = resolveRound(
      attackerFrontline,
      defenderFrontline,
      setup.attackerBonus,
      setup.defenderBonus,
      round
    );

    log.push(roundResult.log);

    // 손실 처리
    for (const lostCard of roundResult.attackerLosses) {
      const index = attackerCards.findIndex((c) => c.id === lostCard.id);
      if (index !== -1) attackerCards.splice(index, 1);
    }

    for (const lostCard of roundResult.defenderLosses) {
      const index = defenderCards.findIndex((c) => c.id === lostCard.id);
      if (index !== -1) defenderCards.splice(index, 1);
    }
  }

  // 승자 결정 (점수 기반)
  const attackerScore = calculateBattleScore(attackerCards, setup.attackerBonus);
  const defenderScore = calculateBattleScore(defenderCards, setup.defenderBonus);

  let winner: 'attacker' | 'defender';
  if (attackerScore > defenderScore) {
    winner = 'attacker';
  } else {
    winner = 'defender';
  }

  return {
    winner,
    attackerScore,
    defenderScore,
    lootChoice: winner === 'attacker' ? 'trade' : null,  // 승자가 선택 가능
  };
}

function resolveRound(
  attackerFrontline: ArmyCard[],
  defenderFrontline: ArmyCard[],
  _attackerBonus: number,
  _defenderBonus: number,
  round: number
): RoundResult {
  const attackerLosses: ArmyCard[] = [];
  const defenderLosses: ArmyCard[] = [];
  let totalAttackerDamage = 0;
  let totalDefenderDamage = 0;

  // 1:1 매칭으로 전투 수행
  const matchCount = Math.min(attackerFrontline.length, defenderFrontline.length);

  for (let i = 0; i < matchCount; i++) {
    const attacker = attackerFrontline[i];
    const defender = defenderFrontline[i];

    // 상성 확인 (선제공격)
    const attackerHasFirstStrike = hasFirstStrike(attacker.type, defender.type);
    const defenderHasFirstStrike = hasFirstStrike(defender.type, attacker.type);

    if (attackerHasFirstStrike) {
      // 공격자 선제공격
      defender.health -= attacker.attack;
      if (defender.health <= 0) {
        defenderLosses.push(defender);
        totalDefenderDamage += attacker.attack;
      } else {
        // 방어자 반격
        attacker.health -= defender.attack;
        if (attacker.health <= 0) {
          attackerLosses.push(attacker);
        }
        totalAttackerDamage += defender.attack;
        totalDefenderDamage += attacker.attack;
      }
    } else if (defenderHasFirstStrike) {
      // 방어자 선제공격
      attacker.health -= defender.attack;
      if (attacker.health <= 0) {
        attackerLosses.push(attacker);
        totalAttackerDamage += defender.attack;
      } else {
        // 공격자 반격
        defender.health -= attacker.attack;
        if (defender.health <= 0) {
          defenderLosses.push(defender);
        }
        totalAttackerDamage += defender.attack;
        totalDefenderDamage += attacker.attack;
      }
    } else {
      // 동시 공격 (무상성 또는 동일 병종)
      attacker.health -= defender.attack;
      defender.health -= attacker.attack;

      if (attacker.health <= 0) attackerLosses.push(attacker);
      if (defender.health <= 0) defenderLosses.push(defender);

      totalAttackerDamage += defender.attack;
      totalDefenderDamage += attacker.attack;
    }
  }

  const log: CombatLogEntry = {
    round,
    message: `라운드 ${round}: 공격자 ${totalDefenderDamage} 피해 vs 방어자 ${totalAttackerDamage} 피해`,
    damage: totalAttackerDamage + totalDefenderDamage,
  };

  return {
    attackerDamageDealt: totalDefenderDamage,
    defenderDamageDealt: totalAttackerDamage,
    attackerLosses,
    defenderLosses,
    log,
  };
}

export function selectOptimalFrontline(cards: ArmyCard[], enemyCards: ArmyCard[]): ArmyCard[] {
  // 상대 전선의 주요 유형 파악
  const enemyTypes = enemyCards.slice(0, FRONTLINE_SIZE).map((c) => c.type);
  const dominantEnemyType = getMostCommonType(enemyTypes);

  // 상성에 유리한 카드 우선 배치
  const sorted = [...cards].sort((a, b) => {
    const aHasAdvantage = dominantEnemyType && hasFirstStrike(a.type, dominantEnemyType);
    const bHasAdvantage = dominantEnemyType && hasFirstStrike(b.type, dominantEnemyType);

    if (aHasAdvantage && !bHasAdvantage) return -1;
    if (!aHasAdvantage && bHasAdvantage) return 1;

    // 총 전투력으로 정렬
    return (b.attack + b.health) - (a.attack + a.health);
  });

  return sorted.slice(0, FRONTLINE_SIZE);
}

function getMostCommonType(types: ArmyCardType[]): ArmyCardType | null {
  if (types.length === 0) return null;

  const counts: Record<ArmyCardType, number> = {
    infantry: 0,
    artillery: 0,
    cavalry: 0,
    airforce: 0,
  };

  for (const type of types) {
    counts[type]++;
  }

  let maxCount = 0;
  let maxType: ArmyCardType = 'infantry';

  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as ArmyCardType;
    }
  }

  return maxType;
}
