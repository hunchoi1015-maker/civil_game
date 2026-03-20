// src/store/slices/combatSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { CombatState, Position, CombatType, ArmyCard, Player, getAttackerMaxCards, CITY_CAPITAL_MAX_CARDS, LOOT_MAX_PER_SELECTION, createInitialResources, createInitialLuxuryResources } from '../../types';
import { resolveBattlefields, resolvePairedFight } from '../../engine/CombatResolver';
import { shuffleArray, getCombatCardBonus, hasTechnology, hasActiveWonder, hasEnoughLuxuryResource, consumeLuxuryResource } from '../helpers/playerHelpers';
import { BUILDINGS } from '../../constants/buildings';
import { handleCultureTrackAdvancement } from './cultureSlice';

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
  startVillageCombat: (unitId: string, villagePos: Position) => void;
  
  // 🌟 [수정] 오두막 자원 사용 여부를 받는 파라미터(useSecretResource) 추가
  applyCombatSkill: (playerId: string, skillId: string, allocations?: Record<string, number>, targetCardId?: string, useSecretResource?: boolean) => void;
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
  usedCombatSkills: {},
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

    const defender = state.players.find((p) => p.id === defenderId)!;
    let combatType: CombatType = 'field';
    let targetCityId: string | null = null;
    let isWalledCity = false;
    let willDestroyWall = false;

    const moverMilitaryUnits = mover.units.filter(u => u.type === 'military' && state.selectedUnits.includes(u.id));
    const moverSettlerUnits = mover.units.filter(u => u.type === 'settler' && state.selectedUnits.includes(u.id));
    const isMoverMilitary = moverMilitaryUnits.length > 0 || (mover.units.some(u => u.type === 'military' && u.id === state.selectedUnit));
    const isMoverSettler = moverSettlerUnits.length > 0 || (mover.units.some(u => u.type === 'settler' && u.id === state.selectedUnit));

    if (targetTile.cityId) {
      const city = defender.cities.find((c) => c.id === targetTile.cityId);
      if (city) {
        combatType = city.isCapital ? 'capital' : 'city';
        targetCityId = city.id;
        isWalledCity = city.hasWalls;
        
        if (hasTechnology(mover, 'combustion') && isMoverMilitary && city.hasWalls) {
            willDestroyWall = true;
            isWalledCity = false;
        }
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

    const defenderMilitaryUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'military');
    const defenderSettlerUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'settler');

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

    const attackerHasHimeji = hasActiveWonder(attackerPlayer.id, 'himeji_castle', state.map, state.players);
    const defenderHasHimeji = hasActiveWonder(defenderPlayer.id, 'himeji_castle', state.map, state.players);

    const attackerAvailableCards = prepareCards(
        attackerPlayer, 
        attackerMaxCards, 
        rolesSwapped ? defenderSettlerUnits.length > 0 : isMoverSettler, 
        rolesSwapped ? (defenderMilitaryUnits.length > 0 || combatType !== 'field') : isMoverMilitary
    ).map(c => attackerHasHimeji 
        ? { ...c, attack: c.attack + 1, maxHealth: c.maxHealth + 1, health: c.health + 1 }
        : { ...c }
    );
    
    const defenderAvailableCards = prepareCards(
        defenderPlayer, 
        defenderMaxCards, 
        rolesSwapped ? isMoverSettler : defenderSettlerUnits.length > 0, 
        rolesSwapped ? isMoverMilitary : (defenderMilitaryUnits.length > 0 || combatType !== 'field')
    ).map(c => defenderHasHimeji 
        ? { ...c, attack: c.attack + 1, maxHealth: c.maxHealth + 1, health: c.health + 1 }
        : { ...c }
    );

    const getPlayerGeneralBonus = (playerId: string) => {
      let bonus = 0;
      state.map.tiles.forEach(row => {
        row.forEach(tile => {
          if (tile.ownerId === playerId && tile.greatPerson && tile.greatPerson.stats.combatBonus) {
            bonus += tile.greatPerson.stats.combatBonus;
          }
        });
      });
      return bonus;
    };

    let attackerCombatBonus = getPlayerGeneralBonus(attackerPlayer.id);
    for (const city of attackerPlayer.cities) {
        city.buildings.forEach(b => {
            const def = BUILDINGS[b.type as keyof typeof BUILDINGS];
            if (def && def.effects && def.effects.combatBonus) {
                attackerCombatBonus += def.effects.combatBonus;
            }
        });
    }
    
    let defenderCombatBonus = getPlayerGeneralBonus(defenderPlayer.id);
    for (const city of defenderPlayer.cities) {
        city.buildings.forEach(b => {
            const def = BUILDINGS[b.type as keyof typeof BUILDINGS];
            if (def && def.effects && def.effects.combatBonus) {
                defenderCombatBonus += def.effects.combatBonus;
            }
        });
    }
    
    let attackerCityDefenseBonus = 0;
    let defenderCityDefenseBonus = 0;

    if (combatType !== 'field' && targetCityId) {
      const city = defender.cities.find((c) => c.id === targetCityId);
      if (city) {
        let actualDefBonus = city.cityDefenseBonus;
        if (willDestroyWall) {
             const wallBonus = BUILDINGS.walls?.effects?.cityDefenseBonus || 6;
             actualDefBonus = Math.max(0, actualDefBonus - wallBonus);
        }

        if (rolesSwapped) {
          attackerCityDefenseBonus = actualDefBonus;
        } else {
          defenderCityDefenseBonus = actualDefBonus;
        }
      }
    }

    set((s) => {
      if (willDestroyWall && targetCityId) {
          const draftDefender = s.players.find(p => p.id === defenderId);
          if (draftDefender) {
              const draftCity = draftDefender.cities.find(c => c.id === targetCityId);
              if (draftCity) {
                  draftCity.hasWalls = false;
                  draftCity.buildings = draftCity.buildings.filter(b => b.type !== 'walls');
                  const wallBonus = BUILDINGS.walls?.effects?.cityDefenseBonus || 6;
                  draftCity.cityDefenseBonus = Math.max(0, draftCity.cityDefenseBonus - wallBonus);
              }
          }
      }

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
        usedCombatSkills: {},
        log: willDestroyWall ? [{ message: `🔥 [연소] 기술로 인해 전투 시작 전 성벽이 파괴되었습니다!` }] : [],
      };
    });

    if (willDestroyWall) {
        get().addToast(`🔥 [연소] 기술 발동! 전투 시작 전 대상 도시의 성벽이 파괴되었습니다!`,"info");
    }
  },

  startVillageCombat: (unitId, villagePos) => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    const attackerUnit = currentPlayer.units.find(u => u.id === unitId);
    if (!attackerUnit) return;

    const villageCardTemplates: ArmyCard[] = [
        { id: uuidv4(), type: 'infantry', name: '민병대', tier: 1, attack: 2, health: 2, maxHealth: 2,  ownerId: 'village',  },
        { id: uuidv4(), type: 'artillery', name: '투석기', tier: 1, attack: 3, health: 1, maxHealth: 1,  ownerId: 'village', },
        { id: uuidv4(), type: 'cavalry', name: '경기병', tier: 1, attack: 2, health: 2, maxHealth: 2,  ownerId: 'village', },
    ];
    
    const villageCards: ArmyCard[] = [
        { ...villageCardTemplates[0], id: uuidv4() },
        { ...villageCardTemplates[1], id: uuidv4() },
        { ...villageCardTemplates[2], id: uuidv4() },
    ];

    const attackerCardBonus = getCombatCardBonus(currentPlayer);
    const attackerMaxCards = getAttackerMaxCards(1) + attackerCardBonus; 
    
    const shuffledAttackerCards = shuffleArray(currentPlayer.armyCards);
    const attackerHasHimeji = hasActiveWonder(currentPlayer.id, 'himeji_castle', state.map, state.players);

    const attackerAvailableCards = shuffledAttackerCards.slice(0, attackerMaxCards).map(c => 
        attackerHasHimeji 
            ? { ...c, attack: c.attack + 1, maxHealth: c.maxHealth + 1, health: c.health + 1 } 
            : { ...c }
    );
    
    let attackerGeneralBonus = 0;
    
    // 1. 위인이 제공하는 전투 보너스 합산
    state.map.tiles.forEach(row => {
      row.forEach(tile => {
        if (tile.ownerId === currentPlayer.id && tile.greatPerson && tile.greatPerson.stats.combatBonus) {
          attackerGeneralBonus += tile.greatPerson.stats.combatBonus;
        }
      });
    });

    // 🌟 [추가] 2. 도시 건물이 제공하는 전투 보너스 합산 (일반 전투와 동일하게 반영)
    for (const city of currentPlayer.cities) {
        city.buildings.forEach(b => {
            const def = BUILDINGS[b.type as keyof typeof BUILDINGS];
            if (def && def.effects && def.effects.combatBonus) {
                attackerGeneralBonus += def.effects.combatBonus;
            }
        });
    }
    
    set((s) => {
        s.combatState = {
            isActive: true,
            originalMoverId: currentPlayer.id,
            originalDefenderId: 'village',
            attackerRoleId: currentPlayer.id,
            defenderRoleId: 'village',
            combatType: 'field',
            targetTilePosition: { ...villagePos },
            targetCityId: null,
            isWalledCity: false,
            rolesSwapped: false,
            attackerAvailableCards,
            defenderAvailableCards: villageCards,
            battlefields: [],
            placement: {
                currentTurn: 'defender',
                attackerPassed: false,
                defenderPassed: false,
                attackerDeployCount: 0,
                defenderDeployCount: 0,
                attackerMaxCards,
                defenderMaxCards: 3,
            },
            graveyard: [],
            phase: 'placement',
            attackerCombatBonus: attackerGeneralBonus, // 🌟 이제 위인 + 건물 보너스가 모두 포함됨
            defenderCombatBonus: 0, 
            attackerCityDefenseBonus: 0,
            defenderCityDefenseBonus: 0,
            attackerFinalScore: 0,
            defenderFinalScore: 0,
            winner: null,
            winnerPlayerId: null,
            loserPlayerId: null,
            lootSelections: [],
            maxLootSelections: 1,
            usedCombatSkills: {},
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

      if (targetBf && targetBf.attackerCard && targetBf.defenderCard) {
          const result = resolvePairedFight(targetBf.attackerCard, targetBf.defenderCard);
          targetBf.result = result;
          targetBf.resolved = true;

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

          if (targetBf.attackerCard.health <= 0) {
            targetBf.attackerCard.health = 0;
            cs.graveyard.push(targetBf.attackerCard);
            targetBf.attackerCard = null;
            targetBf.resolved = false;
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

      const availableCards = isAttacker ? cs.attackerAvailableCards : cs.defenderAvailableCards;
      const currentDeployCount = isAttacker ? cs.placement.attackerDeployCount : cs.placement.defenderDeployCount;
      const currentMaxCards = isAttacker ? cs.placement.attackerMaxCards : cs.placement.defenderMaxCards;
      
      if (availableCards.length > 0 && currentDeployCount < currentMaxCards) {
          return; // 패스 거부
      }
      
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

  // 🌟 [수정] 기술 능력 사용 시 자원 출처(비밀 자원 여부)에 따른 차감 로직 래핑
  applyCombatSkill: (playerId: string, skillId: string, allocations?: Record<string, number>, targetCardId?: string, useSecretResource: boolean = false) => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive) return;

      if (!cs.usedCombatSkills) cs.usedCombatSkills = {};
      if (!cs.usedCombatSkills[playerId]) cs.usedCombatSkills[playerId] = [];

      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const isAttacker = cs.attackerRoleId === playerId;

      // 🌟 [추가] 철(iron) 1개를 출처에 맞게 안전하게 소비하는 헬퍼 함수
      const tryConsumeIron = () => {
          if (useSecretResource) {
              // 오두막(마을) 토큰에서 지불
              const secretIdx = player.secretResources?.findIndex(r => r.type === 'iron');
              if (secretIdx !== undefined && secretIdx !== -1) {
                  player.secretResources!.splice(secretIdx, 1);
                  return true;
              }
              return false;
          } else {
              // 일반 사치품에서 지불
              if (hasEnoughLuxuryResource(player, 'iron', 1)) {
                  consumeLuxuryResource(player, state.marketResources, 'iron', 1);
                  return true;
              }
              return false;
          }
      };
      
      // ==========================================
      // 🌿 생물학 (무료): 내 전장 모든 부대 풀 회복
      // ==========================================
      if (skillId === 'biology') {
        cs.battlefields.forEach(bf => {
          const card = isAttacker ? bf.attackerCard : bf.defenderCard;
          if (card) card.health = card.maxHealth;
        });
        cs.usedCombatSkills[playerId].push(skillId);
        cs.log.push({ message: `🌿 ${player.name}이(가) '생물학'으로 모든 부대의 체력을 회복했습니다!` });
        return;
      }

      // ==========================================
      // 💥 수학/탄도학 (철 1 소모): 적 전장 부대에 데미지 분배 (파괴 로직 유지)
      // ==========================================
      if (skillId === 'mathematics' || skillId === 'ballistics') {
        // 🌟 [수정] 헬퍼를 통해 결제 확인 후 기존 로직 100% 실행
        if (tryConsumeIron()) {
          if (allocations) {
            Object.entries(allocations).forEach(([bfId, damage]) => {
              if (damage <= 0) return;
              const bf = cs.battlefields.find(b => b.id === bfId);
              if (bf) {
                const targetCard = isAttacker ? bf.defenderCard : bf.attackerCard;
                if (targetCard) {
                  targetCard.health -= damage;
                  // 💀 즉사 처리 (체력 0 이하 묘지행 & 전장 비우기)
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
          cs.usedCombatSkills[playerId].push(skillId);
          const techName = skillId === 'mathematics' ? '수학' : '탄도학';
          cs.log.push({ message: `💥 ${player.name}이(가) ${useSecretResource ? '오두막 철' : '사치품 철'}을 소모하여 '${techName}'(으)로 적 부대에 데미지를 입혔습니다!` });
        } else {
          get().addToast(`${useSecretResource ? '오두막' : '사치품'} 철이 부족합니다.`,"warning");
        }
        return;
      }

      // ==========================================
      // 🥩 축산 (무료): 내 전장 부대에 회복 분배
      // ==========================================
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
        cs.usedCombatSkills[playerId].push(skillId);
        cs.log.push({ message: `🥩 ${player.name}이(가) '축산'으로 부대의 체력을 회복했습니다!` });
        return;
      }

      // ==========================================
      // 🔨 금속가공 (철 1 소모): 손패 카드를 전장에 낼 때 공격력 영구 버프
      // ==========================================
      if (skillId === 'metal_casting' && targetCardId) {
        // 🌟 [수정] 헬퍼를 통해 결제 확인 후 기존 로직 100% 실행
        if (tryConsumeIron()) {
          const baseCard = player.armyCards.find(c => c.id === targetCardId);
          if (baseCard) {
            baseCard.attack += 3;
            (baseCard as any).metalCastingBuff = ((baseCard as any).metalCastingBuff || 0) + 3;
          }
          
          const availableCards = isAttacker ? cs.attackerAvailableCards : cs.defenderAvailableCards;
          const handCard = availableCards.find(c => c.id === targetCardId);
          if (handCard) {
            handCard.attack += 3;
            (handCard as any).metalCastingBuff = ((handCard as any).metalCastingBuff || 0) + 3;
          }
          
          cs.usedCombatSkills[playerId].push(skillId);
          cs.log.push({ message: `🔨 ${player.name}이(가) ${useSecretResource ? '오두막 철' : '사치품 철'}을 소모하여 '금속가공' 버프를 적용합니다!` });
        } else {
          get().addToast(`${useSecretResource ? '오두막' : '사치품'} 철이 부족합니다.`,"warning");
        }
        return;
      }
    });
  },

  resolveBattlefieldsAction: () => {
    const cs = get().combatState;
    if (!cs.isActive || cs.phase !== 'resolution') return;
    
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
      
      // 🌟 [수정] 마을과의 전투라도 무조건 점수(Scoring) 단계를 거치도록 변경
      cs.phase = 'scoring';
    });
  },

  proceedToLoot: () => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive) return;

      // 🌟 [추가] 마을과의 전투는 전리품 갈취 단계가 없으므로 바로 결과창으로 넘어감
      if (cs.defenderRoleId === 'village') {
        cs.maxLootSelections = 0;
        cs.phase = 'result';
        return;
      }

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
      const defenderId = state.combatState.originalDefenderId;
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
            (card as any).metalCastingBuff = 0; 
          }
        });
      });

      state.combatState.graveyard.forEach(card => {
        if ((card as any).metalCastingBuff) {
          card.attack -= (card as any).metalCastingBuff;
          (card as any).metalCastingBuff = 0;
        }
      });

      if (winner && state.combatState.lootSelections.length > 0) {
        for (const loot of state.combatState.lootSelections) {
          if (loot.type === 'trade') {
            winner.resources.trade = Math.min(27, winner.resources.trade + loot.amount);
          } else {
            winner.resources.culture += loot.amount;
          }
        }
      }

      if (winner) {
        const legalism = winner.technologies.find(t => t.id === 'code_of_laws');
        if (legalism && !legalism.abilityUsedThisTurn) {
            const maxTokens = legalism.resourceAbility?.maxTokens || 4; 
            const currentTokens = legalism.tokensOnCard || 0;
            if (currentTokens < maxTokens) {
                legalism.tokensOnCard = currentTokens + 1;
                legalism.abilityUsedThisTurn = true;
                const oldCurrency = winner.resources.currency || 0;
                winner.resources.currency = Math.min(15, oldCurrency + 1);
                state.combatState.log.push({ 
                    message: `⚖️ ${winner.name}이(가) 전투 승리로 '법계' 능력을 발동하여 화폐를 1 획득했습니다! 💰(${legalism.tokensOnCard}/${maxTokens})` 
                });
            }
        }
      }

      const graveyardIds = new Set(state.combatState.graveyard.map((c) => c.id));
      if (winner) {
        winner.armyCards = winner.armyCards.filter((c) => !graveyardIds.has(c.id));
      }
      if (loser) {
        loser.armyCards = loser.armyCards.filter((c) => !graveyardIds.has(c.id));
      }

      const targetTile = state.map.tiles[targetPos.y][targetPos.x];
      
      if (defenderId === 'village') {
        const attackerUnitId = (state.combatState as any).attackerUnitId;
        // 🌟 다중 선택된 유닛이 있으면 가져오고, 단일 유닛 전투라면 attackerUnitId를 가져옵니다.
        const movingUnitIds = state.selectedUnits.length > 0 
            ? state.selectedUnits 
            : (state.selectedUnit ? [state.selectedUnit] : (attackerUnitId ? [attackerUnitId] : []));

        if (mover && winnerId === moverId) {
          if (targetTile.object?.type === 'village') {
            const reward = targetTile.object.reward;
            
            if (reward.type === 'resource') {
              if (!mover.secretResources) mover.secretResources = [];
              mover.secretResources.push({
                  id: uuidv4(),
                  type: reward.resource as any,
                  source: 'village'
              });
            } else if (reward.type === 'spy') {
              mover.spies += 1;
            } else if (reward.type === 'greatPerson') {
              mover.greatPeople += 1;
            } else if (reward.type === 'nuclear') {
              mover.nuclearMaterial += 1;
            }

            targetTile.object = undefined;

            // 🌟 승리 시: 전투에 참여한 유닛 그룹 전체를 마을 타일로 이동
            for (const uId of movingUnitIds) {
              const unit = mover.units.find(u => u.id === uId);
              if (unit) {
                const oldTile = state.map.tiles[unit.position.y][unit.position.x];
                oldTile.unitIds = oldTile.unitIds.filter(id => id !== unit.id);
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
          // 🌟 패배 시: 그룹 전체 유닛 파괴
          for (const uId of movingUnitIds) {
            const unitIndex = mover.units.findIndex(u => u.id === uId);
            if (unitIndex !== -1) {
              const unit = mover.units[unitIndex];
              const tile = state.map.tiles[unit.position.y][unit.position.x];
              tile.unitIds = tile.unitIds.filter(id => id !== unit.id);
              mover.units.splice(unitIndex, 1);
            }
          }
        }
      }
      else {
        if (mover && winnerId === moverId) {
          const defenderPlayer = state.players.find((p) => p.id === defenderId);
          
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

          if (state.combatState.combatType === 'city' && state.combatState.targetCityId && defenderPlayer) {
            const cityIndex = defenderPlayer.cities.findIndex(
              (c) => c.id === state.combatState.targetCityId
            );
            if (cityIndex !== -1) {
              defenderPlayer.cities.splice(cityIndex, 1);
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
                      tile.wonder = undefined; 
                  }
              });
            }
          }
          
          if (state.combatState.combatType === 'capital') {
            state.winner = moverId;
            state.winCondition = 'military';
            state.isGameOver = true;
          }

        } else if (mover && winnerId !== moverId) {
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

      if (winner && winner.nation === 'rome') {
        if (defenderId === 'village' || state.combatState.combatType === 'city' || state.combatState.combatType === 'capital') {
            handleCultureTrackAdvancement(state, winner.id, `🏛️ [로마 제국] 전투 승리로 문화 트랙이 1칸 전진했습니다!`);
        }
      }

      const chinaPlayers = allPlayersInCombat.filter(p => p.nation === 'china');
      chinaPlayers.forEach(chinaPlayer => {
        const chinaDeadCards = state.combatState.graveyard.filter(c => c.ownerId === chinaPlayer.id);
        if (chinaDeadCards.length > 0) {
            state.chinaGraveyardPrompt = { playerId: chinaPlayer.id, cards: chinaDeadCards };
        }
      });
      
      state.combatState = { ...initialCombatState };
      state.selectedUnits = [];
    });
  },

  startDevCombat: (attackerCards, defenderCards, attackerBonus, defenderBonus, attackerCityDefense, defenderCityDefense, combatType) => {
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
                unplacedGreatPeople:[],
                secretResources: [],

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
                unplacedGreatPeople:[],
                secretResources: [],

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
          usedCombatSkills: {},
          log: [],
        };
    });
  },
});