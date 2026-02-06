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
  attackerCityDefenseBonus: number; 
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

// [변경] export 추가: 스토어에서 즉시 전투 시 호출하기 위함
export function resolvePairedFight(
  attackerCard: ArmyCard,
  defenderCard: ArmyCard
): BattlefieldResult {
  const attCard = { ...attackerCard };
  const defCard = { ...defenderCard };
  
  // 개척자 공격 참여시 
  const isAttackerSettler = attCard.type === 'settler';
  const isDefenderSettler = defCard.type === 'settler';

  if (isAttackerSettler || isDefenderSettler) {
    return {
      attackerSurvived: !isAttackerSettler, // 개척자면 false (사망)
      defenderSurvived: !isDefenderSettler,
      attackerDamageDealt: isAttackerSettler ? 0 : 99, // 일방적 학살
      defenderDamageDealt: isDefenderSettler ? 0 : 99,
      firstStriker: isAttackerSettler ? 'defender' : 'attacker',
    };
  }

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

  // 원본 카드에 체력 반영 (참조를 끊고 복사본을 썼으므로 결과 객체 반환용 값만 계산됨)
  // 주의: 실제 원본 객체 수정은 호출부(store)에서 처리하거나, 여기서 반환된 값을 토대로 처리해야 함
  
  return {
    attackerSurvived: attCard.health > 0,
    defenderSurvived: defCard.health > 0,
    attackerDamageDealt: attCard.attack,
    defenderDamageDealt: defCard.attack,
    firstStriker,
  };
}

// 모든 전장 해결 (최종 점수 계산 및 로그 생성)
export function resolveBattlefields(
  setup: CombatResolutionSetup
): CombatResolutionResult {
  const battlefields = JSON.parse(JSON.stringify(setup.battlefields)) as Battlefield[];
  const graveyard: ArmyCard[] = [];
  const log: CombatLogEntry[] = [];

  for (const bf of battlefields) {
    // [변경] 이미 해결된 전장(즉시 전투)은 건너뛰고, 미해결 전장만 처리
    if (!bf.resolved && bf.attackerCard && bf.defenderCard) {
      const result = resolvePairedFight(bf.attackerCard, bf.defenderCard);
      bf.result = result;
      bf.resolved = true;
    }

    // 결과 처리 (로그 생성 및 묘지행 판단)
    if (bf.result && bf.attackerCard && bf.defenderCard) {
      const attackerName = bf.attackerCard.name;
      const defenderName = bf.defenderCard.name;
      const result = bf.result;

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
      // 짝 없는 카드: 자동 생존 처리
      if (!bf.resolved) {
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
    setup.attackerCityDefenseBonus,
    
  );
  // [변경] 방어 측은 cityDefenseBonus 합산 (이전 단계 요청 반영)
  const defenderFinalScore = calculateBattleScore(
    survivingDefenderCards,
    setup.defenderCombatBonus,
    setup.defenderCityDefenseBonus
  );

  // 승자 결정: 동점 시 원래 이동자(mover)가 패배 (규칙 6.19)
  let winner: 'attacker' | 'defender';
  if (attackerFinalScore > defenderFinalScore) {
    winner = 'attacker';
  } else {
    // 동점 또는 방어자 우세 → 공격 역할이 패배
    winner = 'defender';
  }

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
