import {
  ArmyCard,
  Battlefield,
  BattlefieldResult,
  CombatLogEntry,
  hasFirstStrike,
  calculateBattleScore,
} from '../types';

export interface CombatResolutionSetup {
  battlefields: Battlefield[];
  attackerCombatBonus: number;
  defenderCombatBonus: number;
  defenderCityDefenseBonus: number;
  originalMoverId: string;
  attackerRoleId: string;
}

export interface CombatResolutionResult {
  resolvedBattlefields: Battlefield[];
  graveyard: ArmyCard[];
  survivingAttackerCards: ArmyCard[];
  survivingDefenderCards: ArmyCard[];
  attackerFinalScore: number;
  defenderFinalScore: number;
  winner: 'attacker' | 'defender';
  winnerPlayerId: string;
  loserPlayerId: string;
  log: CombatLogEntry[];
}

// 개별 전장 전투 해결
function resolvePairedFight(
  attackerCard: ArmyCard,
  defenderCard: ArmyCard
): BattlefieldResult {
  const attCard = { ...attackerCard };
  const defCard = { ...defenderCard };

  const attackerHasFirstStrike = hasFirstStrike(attCard.type, defCard.type);
  const defenderHasFirstStrike = hasFirstStrike(defCard.type, attCard.type);

  let firstStriker: 'attacker' | 'defender' | 'simultaneous' = 'simultaneous';

  if (attackerHasFirstStrike) {
    firstStriker = 'attacker';
    // 공격자 선제공격
    defCard.health -= attCard.attack;
    if (defCard.health > 0) {
      // 방어자 반격
      attCard.health -= defCard.attack;
    }
  } else if (defenderHasFirstStrike) {
    firstStriker = 'defender';
    // 방어자 선제공격
    attCard.health -= defCard.attack;
    if (attCard.health > 0) {
      // 공격자 반격
      defCard.health -= attCard.attack;
    }
  } else {
    // 동시 공격 (무상성 또는 동일 병종)
    attCard.health -= defCard.attack;
    defCard.health -= attCard.attack;
  }

  // 원본 카드에 체력 반영
  attackerCard.health = attCard.health;
  defenderCard.health = defCard.health;

  return {
    attackerSurvived: attCard.health > 0,
    defenderSurvived: defCard.health > 0,
    attackerDamageDealt: attCard.attack,
    defenderDamageDealt: defCard.attack,
    firstStriker,
  };
}

// 모든 전장 해결
export function resolveBattlefields(
  setup: CombatResolutionSetup
): CombatResolutionResult {
  const battlefields = JSON.parse(JSON.stringify(setup.battlefields)) as Battlefield[];
  const graveyard: ArmyCard[] = [];
  const log: CombatLogEntry[] = [];

  for (const bf of battlefields) {
    if (bf.attackerCard && bf.defenderCard) {
      // 양측 카드가 있는 전장: 전투 해결
      const result = resolvePairedFight(bf.attackerCard, bf.defenderCard);
      bf.result = result;
      bf.resolved = true;

      const attackerName = bf.attackerCard.name;
      const defenderName = bf.defenderCard.name;

      if (!result.attackerSurvived) {
        graveyard.push(bf.attackerCard);
      }
      if (!result.defenderSurvived) {
        graveyard.push(bf.defenderCard);
      }

      let msg = `${attackerName} vs ${defenderName}: `;
      if (result.firstStriker === 'attacker') {
        msg += `${attackerName} 선제공격! `;
      } else if (result.firstStriker === 'defender') {
        msg += `${defenderName} 선제공격! `;
      } else {
        msg += '동시 공격! ';
      }

      if (!result.attackerSurvived && !result.defenderSurvived) {
        msg += '양측 모두 전사';
      } else if (!result.attackerSurvived) {
        msg += `${attackerName} 전사`;
      } else if (!result.defenderSurvived) {
        msg += `${defenderName} 전사`;
      } else {
        msg += '양측 모두 생존';
      }

      log.push({
        message: msg,
        battlefieldId: bf.id,
        attackerCard: attackerName,
        defenderCard: defenderName,
      });
    } else {
      // 짝 없는 카드: 자동 생존
      bf.resolved = true;
      bf.result = {
        attackerSurvived: !!bf.attackerCard,
        defenderSurvived: !!bf.defenderCard,
        attackerDamageDealt: 0,
        defenderDamageDealt: 0,
        firstStriker: 'simultaneous',
      };
    }
  }

  // 생존 카드 수집
  const survivingAttackerCards: ArmyCard[] = [];
  const survivingDefenderCards: ArmyCard[] = [];

  for (const bf of battlefields) {
    if (bf.attackerCard && bf.result?.attackerSurvived) {
      survivingAttackerCards.push(bf.attackerCard);
    }
    if (bf.defenderCard && bf.result?.defenderSurvived) {
      survivingDefenderCards.push(bf.defenderCard);
    }
  }

  // 최종 점수 계산: 공격력만 합산 + 보너스
  const attackerFinalScore = calculateBattleScore(
    survivingAttackerCards,
    setup.attackerCombatBonus,
    0
  );
  const defenderFinalScore = calculateBattleScore(
    survivingDefenderCards,
    setup.defenderCombatBonus,
    setup.defenderCityDefenseBonus
  );

  // 승자 결정: 동점 시 원래 이동자(mover)가 패배 (6.19)
  let winner: 'attacker' | 'defender';
  if (attackerFinalScore > defenderFinalScore) {
    winner = 'attacker';
  } else {
    // 동점 또는 방어자 우세 → 공격 역할이 패배
    winner = 'defender';
  }

  // 실제 플레이어 ID로 변환
  const winnerPlayerId = winner === 'attacker'
    ? setup.attackerRoleId
    : (setup.originalMoverId === setup.attackerRoleId
      ? setup.originalMoverId  // not swapped: defender wins, but we need defenderRoleId
      : setup.originalMoverId);

  // 간단하게 재계산: winner role → player ID
  // attackerRoleId가 승리하면 attackerRoleId가 winner
  // defenderRoleId가 승리하면 defenderRoleId가 winner
  // 실제 winnerPlayerId/loserPlayerId는 store에서 결정하는 것이 더 정확
  log.push({
    message: `최종 점수: 공격 ${attackerFinalScore} vs 방어 ${defenderFinalScore}`,
  });

  return {
    resolvedBattlefields: battlefields,
    graveyard,
    survivingAttackerCards,
    survivingDefenderCards,
    attackerFinalScore,
    defenderFinalScore,
    winner,
    winnerPlayerId: '', // store에서 설정
    loserPlayerId: '', // store에서 설정
    log,
  };
}
