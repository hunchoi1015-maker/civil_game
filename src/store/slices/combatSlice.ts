import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { CombatState, Position, CombatType, ArmyCard, Player, getAttackerMaxCards, CITY_CAPITAL_MAX_CARDS, LOOT_MAX_PER_SELECTION, createInitialResources, createInitialLuxuryResources, RewardType } from '../../types';
import { resolveBattlefields, resolvePairedFight } from '../../engine/CombatResolver';
import { shuffleArray } from '../helpers/playerHelpers';

export interface CombatSlice {
  combatState: CombatState;
  startCombat: (moverId: string, targetPosition: Position) => void;
  placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => void;
  passTurn: (playerId: string) => void;
  resolveBattlefieldsAction: () => void;
  proceedToLoot: () => void;
  selectLoot: (choice: 'trade' | 'culture' | 'mercy') => void;
  endCombat: () => void;
  startDevCombat: (
    attackerCards: ArmyCard[], 
    defenderCards: ArmyCard[], 
    attackerBonus: number, 
    defenderBonus: number, 
    attackerCityDefense: number, 
    defenderCityDefense: number, 
    combatType: CombatType
  ) => void;
  // [추가] 마을 전투 시작 액션
  startVillageCombat: (unitId: string, villagePos: Position) => void;
  applyCombatSkill: (playerId: string, skillId: string, allocations?: Record<string, number>, targetCardId?: string) => void;
}

const initialCombatState: CombatState = {
  isActive: false,
  originalMoverId: null,
  originalDefenderId: null,
  attackerRoleId: null,
  defenderRoleId: null,
  combatType: 'field',
  targetTilePosition: null,
  targetCityId: null,
  isWalledCity: false,
  rolesSwapped: false,
  attackerAvailableCards: [],
  defenderAvailableCards: [],
  battlefields: [],
  placement: {
    currentTurn: 'defender',
    attackerPassed: false,
    defenderPassed: false,
    attackerDeployCount: 0,
    defenderDeployCount: 0,
    attackerMaxCards: 0,
    defenderMaxCards: 0,
  },
  graveyard: [],
  phase: 'placement',
  attackerCombatBonus: 0,
  defenderCombatBonus: 0,
  attackerCityDefenseBonus: 0,
  defenderCityDefenseBonus: 0,
  attackerFinalScore: 0,
  defenderFinalScore: 0,
  winner: null,
  winnerPlayerId: null,
  loserPlayerId: null,
  lootSelections: [],
  maxLootSelections: 0,
  usedCombatSkills: [],
  log: [],
};

export const createCombatSlice: StateCreator<GameStore, [["zustand/immer", never]], [], CombatSlice> = (set, get) => ({
  combatState: initialCombatState,

  startCombat: (moverId: string, targetPosition: Position) => {
    const state = get();
    const mover = state.players.find((p) => p.id === moverId);
    if (!mover) return;
    
    const targetTile = state.map.tiles[targetPosition.y][targetPosition.x];
    let defenderId: string | null = null;
    
    // 방어자 식별
    for (const p of state.players) {
      if (p.id === moverId) continue;
      if (p.units.some((u) => targetTile.unitIds.includes(u.id))) {
        defenderId = p.id;
        break;
      }
      if (targetTile.cityId && p.cities.some((c) => c.id === targetTile.cityId)) {
        defenderId = p.id;
        break;
      }
    }
    if (!defenderId) return;
    //usedCombatSkills: [],
    const defender = state.players.find((p) => p.id === defenderId)!;
    let combatType: CombatType = 'field';
    let targetCityId: string | null = null;
    let isWalledCity = false;
    
    if (targetTile.cityId) {
      const city = defender.cities.find((c) => c.id === targetTile.cityId);
      if (city) {
        combatType = city.isCapital ? 'capital' : 'city';
        targetCityId = city.id;
        isWalledCity = city.hasWalls || city.isCapital;
      }
    }
    
    let attackerRoleId = moverId;
    let defenderRoleId = defenderId;
    let rolesSwapped = false;
    if (isWalledCity) {
      attackerRoleId = defenderId;
      defenderRoleId = moverId;
      rolesSwapped = true;
    }

    const moverMilitaryUnits = mover.units.filter(u => u.type === 'military' && state.selectedUnits.includes(u.id));
    const moverSettlerUnits = mover.units.filter(u => u.type === 'settler' && state.selectedUnits.includes(u.id));
    const defenderMilitaryUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'military');
    const defenderSettlerUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'settler');

    const isMoverMilitary = moverMilitaryUnits.length > 0 || (mover.units.some(u => u.type === 'military' && u.id === state.selectedUnit));
    const isMoverSettler = moverSettlerUnits.length > 0 || (mover.units.some(u => u.type === 'settler' && u.id === state.selectedUnit));

    const isSettlerMassacre = combatType === 'field' && 
                              defenderMilitaryUnits.length === 0 && 
                              defenderSettlerUnits.length > 0;

    let moverMaxCards: number;
    let defenderSideMaxCards: number;

    if (combatType === 'field') {
      const moverCount = Math.max(moverMilitaryUnits.length, isMoverMilitary ? 1 : 0);
      moverMaxCards = getAttackerMaxCards(moverCount);
      defenderSideMaxCards = getAttackerMaxCards(Math.max(defenderMilitaryUnits.length, 1));
    } else {
      const moverCount = Math.max(moverMilitaryUnits.length, isMoverMilitary ? 1 : 0);
      moverMaxCards = getAttackerMaxCards(moverCount);
      defenderSideMaxCards = CITY_CAPITAL_MAX_CARDS;
    }

    const attackerMaxCards = rolesSwapped ? defenderSideMaxCards : moverMaxCards;
    const defenderMaxCards = rolesSwapped ? moverMaxCards : defenderSideMaxCards;
    const attackerPlayer = state.players.find((p) => p.id === attackerRoleId)!;
    const defenderPlayer = state.players.find((p) => p.id === defenderRoleId)!;

    const prepareCards = (player: Player, max: number, hasSettler: boolean, hasMilitary: boolean) => {
      let cards: ArmyCard[] = [];
      if (hasMilitary) {
          const shuffled = shuffleArray(player.armyCards);
          cards = shuffled.slice(0, max);
      }
      return cards;
    };

    const attackerAvailableCards = prepareCards(
        attackerPlayer, 
        attackerMaxCards, 
        rolesSwapped ? defenderSettlerUnits.length > 0 : isMoverSettler, 
        rolesSwapped ? (defenderMilitaryUnits.length > 0 || combatType !== 'field') : isMoverMilitary
    );
    
    const defenderAvailableCards = prepareCards(
        defenderPlayer, 
        defenderMaxCards, 
        rolesSwapped ? isMoverSettler : defenderSettlerUnits.length > 0, 
        rolesSwapped ? isMoverMilitary : (defenderMilitaryUnits.length > 0 || combatType !== 'field')
    );

    let attackerCombatBonus = 0;
    for (const city of attackerPlayer.cities) attackerCombatBonus += city.combatBonus;
    
    let defenderCombatBonus = 0;
    for (const city of defenderPlayer.cities) defenderCombatBonus += city.combatBonus;
    
    let attackerCityDefenseBonus = 0;
    let defenderCityDefenseBonus = 0;

    if (combatType !== 'field' && targetCityId) {
      const city = defender.cities.find((c) => c.id === targetCityId);
      if (city) {
        if (rolesSwapped) {
          attackerCityDefenseBonus = city.cityDefenseBonus;
        } else {
          defenderCityDefenseBonus = city.cityDefenseBonus;
        }
      }
    }

    set((s) => {
      s.combatState = {
        isActive: true,
        originalMoverId: moverId,
        originalDefenderId: defenderId,
        attackerRoleId,
        defenderRoleId,
        combatType,
        targetTilePosition: { ...targetPosition },
        targetCityId,
        isWalledCity,
        rolesSwapped,
        attackerAvailableCards,
        defenderAvailableCards,
        battlefields: [],
        placement: {
          currentTurn: 'defender',
          attackerPassed: false,
          defenderPassed: false,
          attackerDeployCount: 0,
          defenderDeployCount: 0,
          attackerMaxCards,
          defenderMaxCards,
        },
        graveyard: [],
        phase: isSettlerMassacre ? 'loot' : 'placement',
        attackerCombatBonus,
        defenderCombatBonus,
        attackerCityDefenseBonus,
        defenderCityDefenseBonus,
        attackerFinalScore: 0,
        defenderFinalScore: 0,
        winner: isSettlerMassacre ? 'attacker' : null,
        winnerPlayerId: isSettlerMassacre ? attackerRoleId : null,
        loserPlayerId: isSettlerMassacre ? defenderRoleId : null,
        lootSelections: [],
        maxLootSelections: (isSettlerMassacre || combatType === 'field') ? 1 : (combatType === 'city' ? 2 : 0),
        usedCombatSkills: [],
        log: [],
      };
    });
  },

  // [추가] 마을 전투 시작 함수
  startVillageCombat: (unitId, villagePos) => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    const attackerUnit = currentPlayer.units.find(u => u.id === unitId);
    if (!attackerUnit) return;

    // 마을 방어군 생성 (Tier 1 랜덤 - 총 전투력 4)
    // 기획: 민병대(2/2), 투석기(3/1), 경기병(2/2) 중 하나
    const villageCardTemplates: ArmyCard[] = [
        { id: uuidv4(), type: 'infantry', name: '민병대', tier: 1, attack: 2, health: 2, maxHealth: 2,  ownerId: 'village', isDeployed: false, },
        { id: uuidv4(), type: 'artillery', name: '투석기', tier: 1, attack: 3, health: 1, maxHealth: 1,  ownerId: 'village', isDeployed: false,},
        { id: uuidv4(), type: 'cavalry', name: '경기병', tier: 1, attack: 2, health: 2, maxHealth: 2,  ownerId: 'village', isDeployed: false,},
    ];
    
    // 마을도 카드를 1장만 사용한다고 가정 (또는 기획에 따라 여러 장일 수도 있음. 여기서는 1장으로 예시)
    // "마을의 부대카드는 민병대 1장, 투석기 1장, 경기병 1장" 이라고 하셨는데,
    // "이동시 전투 발생"이므로 한 번에 이 3장과 다 싸우는 것인지, 그 중 하나가 랜덤으로 나오는 것인지 명확하지 않으나
    // 보통 초반 야만인 전투는 1:1이므로 랜덤으로 1장을 뽑아 배치하거나, 
    // 혹은 3장을 모두 덱에 넣고 싸우게 할 수 있습니다. 
    // 여기서는 "전투력 4 기준, 랜덤"이라는 표현과 "부대카드는 ~ 1장, ~ 1장, ~ 1장" 표현을 종합하여
    // **3장 모두를 보유한 상태**로 시작하도록 설정하겠습니다. (플레이어도 여러 장일 수 있으므로)
    
    const villageCards: ArmyCard[] = [
        { ...villageCardTemplates[0], id: uuidv4() },
        { ...villageCardTemplates[1], id: uuidv4() },
        { ...villageCardTemplates[2], id: uuidv4() },
    ];

    // 플레이어의 카드 준비 (셔플 후 최대 장수만큼)
    // 야전이므로 유닛 수에 따라 카드 수가 결정됨 (여기서는 단일 유닛 진입이므로 1유닛 -> 최대 2장)
    const attackerMaxCards = getAttackerMaxCards(1); 
    const shuffledAttackerCards = shuffleArray(currentPlayer.armyCards);
    const attackerAvailableCards = shuffledAttackerCards.slice(0, attackerMaxCards);

    set((s) => {
        s.combatState = {
            isActive: true,
            originalMoverId: currentPlayer.id,
            originalDefenderId: 'village',
            attackerRoleId: currentPlayer.id,
            defenderRoleId: 'village', // 특수 ID
            combatType: 'field',
            targetTilePosition: { ...villagePos },
            targetCityId: null,
            isWalledCity: false,
            rolesSwapped: false,
            attackerAvailableCards,
            defenderAvailableCards: villageCards,
            battlefields: [],
            placement: {
                currentTurn: 'defender', // 방어자(마을)부터 배치? 혹은 플레이어부터? 보통 방어자 우선
                attackerPassed: false,
                defenderPassed: false,
                attackerDeployCount: 0,
                defenderDeployCount: 0,
                attackerMaxCards,
                defenderMaxCards: 3, // 마을은 3장 다 씀
            },
            graveyard: [],
            phase: 'placement',
            attackerCombatBonus: 0, // 도시 보너스 등은 적용 안됨 (마을 밖 야전)
            defenderCombatBonus: 0, 
            attackerCityDefenseBonus: 0,
            defenderCityDefenseBonus: 0,
            attackerFinalScore: 0,
            defenderFinalScore: 0,
            winner: null,
            winnerPlayerId: null,
            loserPlayerId: null,
            lootSelections: [],
            maxLootSelections: 1, // 승리 시 보상은 따로 처리되지만 형식상 1
            usedCombatSkills: [],
            log: [{ message: "원주민 마을과의 전투가 시작되었습니다!" }],
        };
        (s.combatState as any).attackerUnitId = unitId;
    });
  },

  placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive || cs.phase !== 'placement') return;
      
      const isAttacker = cs.attackerRoleId === playerId;
      // 마을(NPC)인 경우 defenderRoleId가 'village'이므로 playerId와 일치하지 않음.
      // 하지만 UI에서 defender 카드를 클릭하면 handlePlaceCard가 defenderRoleId('village')로 호출함.
      const isDefender = cs.defenderRoleId === playerId;

      if (!isAttacker && !isDefender) return;

      const availableCards = isAttacker ? cs.attackerAvailableCards : cs.defenderAvailableCards;
      const placement = cs.placement;
      
      const expectedTurn = isAttacker ? 'attacker' : 'defender';
      if (placement.currentTurn !== expectedTurn) return;

      const cardIndex = availableCards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return;
      const card = availableCards.splice(cardIndex, 1)[0];
      
      let targetBf = null;

      if (battlefieldId === null) {
        const newBf = {
          id: uuidv4(),
          attackerCard: isAttacker ? card : null,
          defenderCard: isAttacker ? null : card,
          resolved: false,
          result: null,
        };
        cs.battlefields.push(newBf);
        targetBf = newBf;
      } else {
        const bf = cs.battlefields.find((b) => b.id === battlefieldId);
        if (!bf) return;
        if (isAttacker) {
          if (bf.attackerCard) return;
          bf.attackerCard = card;
        } else {
          if (bf.defenderCard) return;
          bf.defenderCard = card;
        }
        bf.resolved = false;
        targetBf = bf;
      }

      // 카드 배치 즉시 해결 로직 (기존 로직 유지)
      if (targetBf && targetBf.attackerCard && targetBf.defenderCard) {
          const result = resolvePairedFight(targetBf.attackerCard, targetBf.defenderCard);
          targetBf.result = result;
          targetBf.resolved = true;

          // 데미지 적용
          if (result.firstStriker === 'attacker') {
              targetBf.defenderCard.health -= result.attackerDamageDealt;
              if (targetBf.defenderCard.health > 0) {
                  targetBf.attackerCard.health -= result.defenderDamageDealt;
              }
          } else if (result.firstStriker === 'defender') {
               targetBf.attackerCard.health -= result.defenderDamageDealt;
               if (targetBf.attackerCard.health > 0) {
                   targetBf.defenderCard.health -= result.attackerDamageDealt;
               }
          } else {
               targetBf.defenderCard.health -= result.attackerDamageDealt;
               targetBf.attackerCard.health -= result.defenderDamageDealt;
          }

          // 사망 처리
          if (targetBf.attackerCard.health <= 0) {
            targetBf.attackerCard.health = 0;
            cs.graveyard.push(targetBf.attackerCard);
            targetBf.attackerCard = null;
            targetBf.resolved = false; // 한쪽이 죽었으므로 빈 자리가 생김
          }
          if (targetBf.defenderCard && targetBf.defenderCard.health <= 0) {
            targetBf.defenderCard.health = 0;
            cs.graveyard.push(targetBf.defenderCard);
            targetBf.defenderCard = null;
            targetBf.resolved = false;
          }
      }

      if (isAttacker) placement.attackerDeployCount++;
      else placement.defenderDeployCount++;
      
      placement.currentTurn = isAttacker ? 'defender' : 'attacker';
      if (isAttacker) placement.attackerPassed = false;
      else placement.defenderPassed = false;
    });
  },

  passTurn: (playerId: string) => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive || cs.phase !== 'placement') return;
      
      const isAttacker = cs.attackerRoleId === playerId;
      const isDefender = cs.defenderRoleId === playerId;

      if (!isAttacker && !isDefender) return;

      if (isAttacker) cs.placement.attackerPassed = true;
      else cs.placement.defenderPassed = true;

      if (cs.placement.attackerPassed && cs.placement.defenderPassed) {
        cs.phase = 'resolution';
      } else {
        cs.placement.currentTurn = isAttacker ? 'defender' : 'attacker';
        const otherPassed = isAttacker ? cs.placement.defenderPassed : cs.placement.attackerPassed;
        const otherHandEmpty = isAttacker ? (cs.defenderAvailableCards.length === 0) : (cs.attackerAvailableCards.length === 0);

        if (otherPassed || otherHandEmpty) {
          cs.phase = 'resolution';
        }
      }
    });
  },

  // 기술 능력 (전투)
  applyCombatSkill: (playerId: string, skillId: string, allocations?: Record<string, number>, targetCardId?: string) => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive) return;
      if (!cs.usedCombatSkills) cs.usedCombatSkills = [];

      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const isAttacker = cs.attackerRoleId === playerId;
      const currentRole = isAttacker ? 'attacker' : 'defender'; // 🌟 [추가] 역할 판별
      
      if (skillId === 'biology') {
        cs.battlefields.forEach(bf => {
          const card = isAttacker ? bf.attackerCard : bf.defenderCard;
          if (card) card.health = card.maxHealth;
        });
        cs.usedCombatSkills.push(`${currentRole}_${skillId}`); // 🌟 ID 대신 역할로 저장
        cs.log.push({ message: `🌿 ${player.name}이(가) '생물학'으로 모든 부대의 체력을 회복했습니다!` });
        return;
      }

      if (skillId === 'metal_casting' && targetCardId) {
        if (player.luxuryResources.iron >= 1) {
          player.luxuryResources.iron -= 1; 
          
          const targetCard = player.armyCards.find(c => c.id === targetCardId);
          if (targetCard) {
            targetCard.attack += 3;
            (targetCard as any).metalCastingBuff = ((targetCard as any).metalCastingBuff || 0) + 3;
            
            const attCard = cs.attackerAvailableCards.find(c => c.id === targetCardId);
            if (attCard) {
                attCard.attack += 3;
                (attCard as any).metalCastingBuff = ((attCard as any).metalCastingBuff || 0) + 3;
            }
            const defCard = cs.defenderAvailableCards.find(c => c.id === targetCardId);
            if (defCard) {
                defCard.attack += 3;
                (defCard as any).metalCastingBuff = ((defCard as any).metalCastingBuff || 0) + 3;
            }
            
            cs.usedCombatSkills.push(`${currentRole}_${skillId}`);
            cs.log.push({ message: `🔨 ${player.name}이(가) '금속가공'으로 카드를 강화했습니다!` });
          }
        } else {
          alert("철이 부족합니다.");
        }
        return;
      }

      if (skillId === 'mathematics' || skillId === 'ballistics') {
        if (player.luxuryResources.iron >= 1) {
          player.luxuryResources.iron -= 1; 
          
          if (allocations) {
            Object.entries(allocations).forEach(([bfId, damage]) => {
              if (damage <= 0) return;
              const bf = cs.battlefields.find(b => b.id === bfId);
              if (bf) {
                const targetCard = isAttacker ? bf.defenderCard : bf.attackerCard;
                if (targetCard) {
                  targetCard.health -= damage;
                  if (targetCard.health <= 0) {
                     targetCard.health = 0;
                     cs.graveyard.push(targetCard);
                     if (isAttacker) bf.defenderCard = null;
                     else bf.attackerCard = null;
                     bf.resolved = false;
                  }
                }
              }
            });
          }
          cs.usedCombatSkills.push(`${currentRole}_${skillId}`); // 🌟 ID 대신 역할로 저장
          const techName = skillId === 'mathematics' ? '수학' : '탄도학';
          cs.log.push({ message: `💥 ${player.name}이(가) '${techName}'(으)로 적 부대에 데미지를 입혔습니다!` });
        } else {
          alert("철이 부족합니다.");
        }
        return;
      }

      if (skillId === 'animal_husbandry') {
        if (allocations) {
          Object.entries(allocations).forEach(([bfId, healAmount]) => {
            if (healAmount <= 0) return;
            const bf = cs.battlefields.find(b => b.id === bfId);
            if (bf) {
              const targetCard = isAttacker ? bf.attackerCard : bf.defenderCard;
              if (targetCard) {
                targetCard.health = Math.min(targetCard.maxHealth, targetCard.health + healAmount);
              }
            }
          });
        }
        cs.usedCombatSkills.push(`${currentRole}_${skillId}`); // 🌟 ID 대신 역할로 저장
        cs.log.push({ message: `🥩 ${player.name}이(가) '축산'으로 부대의 체력을 회복했습니다!` });
      }
    });
  },

  resolveBattlefieldsAction: () => {
    const cs = get().combatState;
    if (!cs.isActive || cs.phase !== 'resolution') return;
    
    // 마을인 경우 원본 ID가 없으므로 안전한 문자열 사용
    const originalMoverId = cs.originalMoverId || 'unknown';
    const attackerRoleId = cs.attackerRoleId || 'unknown';

    const result = resolveBattlefields({
      battlefields: JSON.parse(JSON.stringify(cs.battlefields)),
      attackerCombatBonus: cs.attackerCombatBonus,
      defenderCombatBonus: cs.defenderCombatBonus,
      attackerCityDefenseBonus: cs.attackerCityDefenseBonus,
      defenderCityDefenseBonus: cs.defenderCityDefenseBonus,
      originalMoverId: originalMoverId,
      attackerRoleId: attackerRoleId,
    });
    
    set((state) => {
      const cs = state.combatState;
      cs.battlefields = result.resolvedBattlefields;
      
      const uniqueGraveyard = [...cs.graveyard];
      result.graveyard.forEach(c => {
          if (!uniqueGraveyard.some(gc => gc.id === c.id)) uniqueGraveyard.push(c);
      });
      cs.graveyard = uniqueGraveyard;
      
      cs.attackerFinalScore = result.attackerFinalScore;
      cs.defenderFinalScore = result.defenderFinalScore;
      cs.winner = result.winner;
      
      if (result.winner === 'attacker') {
        cs.winnerPlayerId = cs.attackerRoleId;
        cs.loserPlayerId = cs.defenderRoleId;
      } else {
        cs.winnerPlayerId = cs.defenderRoleId;
        cs.loserPlayerId = cs.attackerRoleId;
      }
      cs.log = [...cs.log, ...result.log];
      
      // 마을 전투면 바로 결과 단계로 (약탈 단계 생략)
      if (cs.defenderRoleId === 'village') {
          cs.maxLootSelections = 0;
          cs.phase = 'result';
      } else {
          cs.phase = 'scoring';
      }
    });
  },

  proceedToLoot: () => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive) return;
      if (cs.combatType === 'capital' && cs.winnerPlayerId === cs.originalMoverId) {
        cs.maxLootSelections = 0;
        cs.phase = 'result';
        return;
      }
      if (cs.combatType === 'city' && cs.winnerPlayerId === cs.originalMoverId) {
        cs.maxLootSelections = 2;
      } else {
        cs.maxLootSelections = 1;
      }
      cs.phase = 'loot';
    });
  },

  selectLoot: (choice: 'trade' | 'culture' | 'mercy') => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive || cs.phase !== 'loot') return;
      if (choice === 'mercy') {
          cs.log.push({ message: "승자가 패자에게 자비를 베풀었습니다. (전리품 획득 종료)" });
          cs.phase = 'result';
          return;
      }
      // 마을 상대로는 약탈 단계가 없으므로 loser가 플레이어일 때만 동작
      const loser = state.players.find((p) => p.id === cs.loserPlayerId);
      if (!loser) return;
      
      const available = choice === 'trade' ? loser.resources.trade : loser.resources.culture;
      const amount = Math.min(LOOT_MAX_PER_SELECTION, available);
      cs.lootSelections.push({ type: choice, amount });
      
      if (choice === 'trade') {
        loser.resources.trade = Math.max(0, loser.resources.trade - amount);
      } else {
        loser.resources.culture = Math.max(0, loser.resources.culture - amount);
      }
      
      if (cs.lootSelections.length >= cs.maxLootSelections) {
        cs.phase = 'result';
      }
    });
  },

  endCombat: () => {
    const cs = get().combatState;
    if (!cs.isActive) return;
    
    set((state) => {
      const winnerId = state.combatState.winnerPlayerId;
      const loserId = state.combatState.loserPlayerId;
      const moverId = state.combatState.originalMoverId;
      const defenderId = state.combatState.originalDefenderId; // 방어자 ID (플레이어 또는 'village')
      const targetPos = state.combatState.targetTilePosition;
      
      const winner = winnerId ? state.players.find((p) => p.id === winnerId) : null;
      const loser = loserId ? state.players.find((p) => p.id === loserId) : null;
      const mover = moverId ? state.players.find((p) => p.id === moverId) : null;
      
      if (!targetPos) {
        state.combatState = { ...initialCombatState };
        return;
      }

      const allPlayersInCombat = [winner, loser, mover].filter(Boolean) as Player[];
      allPlayersInCombat.forEach(p => {
        p.armyCards.forEach(card => {
          if ((card as any).metalCastingBuff) {
            card.attack -= (card as any).metalCastingBuff;
            (card as any).metalCastingBuff = 0; // 초기화
          }
        });
      });

      // 혹시 전사해서 묘지에 간 카드도 스탯을 돌려놓음 (다시 부활할 때를 대비)
      state.combatState.graveyard.forEach(card => {
        if ((card as any).metalCastingBuff) {
          card.attack -= (card as any).metalCastingBuff;
          (card as any).metalCastingBuff = 0;
        }
      });

      // 1. 전리품 지급 (PvP인 경우에만 해당, 마을 상대로는 lootSelections가 비어있음)
      if (winner && state.combatState.lootSelections.length > 0) {
        for (const loot of state.combatState.lootSelections) {
          if (loot.type === 'trade') {
            winner.resources.trade = Math.min(27, winner.resources.trade + loot.amount);
          } else {
            winner.resources.culture += loot.amount;
          }
        }
      }

      // 2. 묘지 처리 (카드 체력 회복 로직이 없다면 덱에서 제거)
      const graveyardIds = new Set(state.combatState.graveyard.map((c) => c.id));
      if (winner) {
        winner.armyCards = winner.armyCards.filter((c) => !graveyardIds.has(c.id));
      }
      if (loser) {
        loser.armyCards = loser.armyCards.filter((c) => !graveyardIds.has(c.id));
      }

      const targetTile = state.map.tiles[targetPos.y][targetPos.x];
      
      // ------------------------------------------------------------------
      // [CASE A] 마을 전투 처리
      // ------------------------------------------------------------------
      if (defenderId === 'village') {
        // startVillageCombat에서 저장한 attackerUnitId 가져오기
        const attackerUnitId = (state.combatState as any).attackerUnitId;

        if (mover && winnerId === moverId) {
          // [승리] 보상 획득 + 마을 제거 + 유닛 이동
          if (targetTile.object?.type === 'village') {
            const reward = targetTile.object.reward;
            
            // 보상 지급
            if (reward.type === 'resource') {
              if (!mover.luxuryResources) mover.luxuryResources = createInitialLuxuryResources();
              if (mover.luxuryResources[reward.resource] !== undefined) {
                mover.luxuryResources[reward.resource] += 1;
              }
            } else if (reward.type === 'spy') {
              mover.spies += 1;
            } else if (reward.type === 'greatPerson') {
              mover.greatPeople += 1;
            } else if (reward.type === 'nuclear') {
              mover.nuclearMaterial += 1;
            }

            // 마을 객체 제거
            targetTile.object = undefined;

            // 유닛 이동 처리
            if (attackerUnitId) {
              const unit = mover.units.find(u => u.id === attackerUnitId);
              if (unit) {
                // 이전 타일에서 제거
                const oldTile = state.map.tiles[unit.position.y][unit.position.x];
                oldTile.unitIds = oldTile.unitIds.filter(id => id !== unit.id);
                
                // 새 타일로 이동
                unit.position = { x: targetPos.x, y: targetPos.y };
                unit.movement = 0;
                unit.hasMoved = true;
                if (!targetTile.unitIds.includes(unit.id)) {
                  targetTile.unitIds.push(unit.id);
                }
              }
            }
          }
        } else if (mover && winnerId !== moverId) {
          // [패배] 유닛 삭제 (마을은 유지)
          if (attackerUnitId) {
            const unitIndex = mover.units.findIndex(u => u.id === attackerUnitId);
            if (unitIndex !== -1) {
              const unit = mover.units[unitIndex];
              // 맵에서 유닛 ID 제거
              const tile = state.map.tiles[unit.position.y][unit.position.x];
              tile.unitIds = tile.unitIds.filter(id => id !== unit.id);
              // 플레이어 유닛 목록에서 제거
              mover.units.splice(unitIndex, 1);
            }
          }
        }
      }
      
      // ------------------------------------------------------------------
      // [CASE B] 플레이어 간 전투 (PvP) 처리
      // ------------------------------------------------------------------
      else {
        // 공격자 승리
        if (mover && winnerId === moverId) {
          const defenderPlayer = state.players.find((p) => p.id === defenderId);
          
          // 적 유닛 제거
          if (defenderPlayer) {
            const enemyUnitIds = targetTile.unitIds.filter((id) =>
              defenderPlayer.units.some((u) => u.id === id)
            );
            defenderPlayer.units = defenderPlayer.units.filter(
              (u) => !enemyUnitIds.includes(u.id)
            );
            targetTile.unitIds = targetTile.unitIds.filter(
              (id) => !enemyUnitIds.includes(id)
            );
          }

          // 공격 유닛 이동
          const movingUnitIds = state.selectedUnits.length > 0
            ? state.selectedUnits
            : state.selectedUnit ? [state.selectedUnit] : [];
            
          for (const unitId of movingUnitIds) {
            const unit = mover.units.find((u) => u.id === unitId);
            if (unit) {
              const oldTile = state.map.tiles[unit.position.y][unit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);
              unit.position = { x: targetPos.x, y: targetPos.y };
              unit.movement = 0;
              unit.hasMoved = true;
              if (!targetTile.unitIds.includes(unitId)) {
                targetTile.unitIds.push(unitId);
              }
            }
          }

          // 도시 점령/초토화
          if (state.combatState.combatType === 'city' && state.combatState.targetCityId && defenderPlayer) {
            const cityIndex = defenderPlayer.cities.findIndex(
              (c) => c.id === state.combatState.targetCityId
            );
            if (cityIndex !== -1) {
              defenderPlayer.cities.splice(cityIndex, 1);
              // 주변 9칸 타일 소유권 초기화
              const directions = [
                  {x:0, y:0}, {x:-1,y:-1}, {x:0,y:-1}, {x:1,y:-1}, 
                  {x:-1,y:0}, {x:1,y:0}, {x:-1,y:1}, {x:0,y:1}, {x:1,y:1}
              ];
              directions.forEach(d => {
                  const nx = targetPos.x + d.x;
                  const ny = targetPos.y + d.y;
                  if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
                      const tile = state.map.tiles[ny][nx];
                      tile.ownerId = null;
                      tile.cityId = null;
                      tile.buildingType = null;
                  }
              });
            }
          }
          
          // 수도 점령 시 게임 종료
          if (state.combatState.combatType === 'capital') {
            state.winner = moverId;
            state.winCondition = 'military';
            state.isGameOver = true;
          }

        } else if (mover && winnerId !== moverId) {
          // 방어자 승리 -> 공격 유닛 제거
          const movingUnitIds = state.selectedUnits.length > 0
            ? state.selectedUnits
            : state.selectedUnit ? [state.selectedUnit] : [];
            
          for (const unitId of movingUnitIds) {
            const unit = mover.units.find((u) => u.id === unitId);
            if (unit) {
              const oldTile = state.map.tiles[unit.position.y][unit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);
            }
          }
          mover.units = mover.units.filter((u) => !movingUnitIds.includes(u.id));
        }
      }
      
      // 전투 상태 초기화
      state.combatState = { ...initialCombatState };
      state.selectedUnits = [];
    });
  },

  startDevCombat: (attackerCards, defenderCards, attackerBonus, defenderBonus, attackerCityDefense, defenderCityDefense, combatType) => {
    // (기존 코드 유지)
    const devAttackerId = 'dev-attacker';
    const devDefenderId = 'dev-defender';
    set((state) => {
        if (!state.players.find(p => p.id === devAttackerId)) {
            state.players.push({
                id: devAttackerId, name: 'DEV Attacker', color: 'red', nation: 'rome',
                resources: createInitialResources(), cities: [], units: [], armyCards: [], technologies: [], 
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false, hasResearchedThisTurn: false,
                luxuryResources: createInitialLuxuryResources(),
                spies: 0, greatPeople: 0, nuclearMaterial: 0,
                cultureEventCards: [],
                pendingGreatPerson: false,
                pendingCardDraw: 0,
            });
        }
        if (!state.players.find(p => p.id === devDefenderId)) {
            state.players.push({
                id: devDefenderId, name: 'DEV Defender', color: 'blue', nation: 'china',
                resources: createInitialResources(), cities: [], units: [], armyCards: [], technologies: [], 
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false, hasResearchedThisTurn: false,
                luxuryResources: createInitialLuxuryResources(),
                spies: 0, greatPeople: 0, nuclearMaterial: 0,
                cultureEventCards: [],
                pendingGreatPerson: false,
                pendingCardDraw: 0,

            });
        }
        state.combatState = {
          isActive: true,
          originalMoverId: devAttackerId,
          originalDefenderId: devDefenderId,
          attackerRoleId: devAttackerId,
          defenderRoleId: devDefenderId,
          combatType: combatType,
          targetTilePosition: { x: -1, y: -1 },
          targetCityId: null,
          isWalledCity: combatType !== 'field',
          rolesSwapped: false,
          attackerAvailableCards: attackerCards,
          defenderAvailableCards: defenderCards,
          battlefields: [],
          placement: {
            currentTurn: 'defender',
            attackerPassed: false,
            defenderPassed: false,
            attackerDeployCount: 0,
            defenderDeployCount: 0,
            attackerMaxCards: attackerCards.length, 
            defenderMaxCards: defenderCards.length,
          },
          graveyard: [],
          phase: 'placement',
          attackerCombatBonus: attackerBonus,
          defenderCombatBonus: defenderBonus,
          attackerCityDefenseBonus: attackerCityDefense,
          defenderCityDefenseBonus: defenderCityDefense,
          attackerFinalScore: 0,
          defenderFinalScore: 0,
          winner: null,
          winnerPlayerId: null,
          loserPlayerId: null,
          lootSelections: [],
          maxLootSelections: 1,
          usedCombatSkills: [],
          log: [],
        };
    });
  },
});