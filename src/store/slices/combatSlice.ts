import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { CombatState, Position, CombatType, ArmyCard, Player, getAttackerMaxCards, CITY_CAPITAL_MAX_CARDS, LOOT_MAX_PER_SELECTION, createInitialResources } from '../../types';
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
        log: [],
      };
    });
  },

  placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => {
    set((state) => {
      const cs = state.combatState;
      if (!cs.isActive || cs.phase !== 'placement') return;
      
      const isAttacker = cs.attackerRoleId === playerId;
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

  resolveBattlefieldsAction: () => {
    const cs = get().combatState;
    if (!cs.isActive || cs.phase !== 'resolution') return;
    const result = resolveBattlefields({
      battlefields: JSON.parse(JSON.stringify(cs.battlefields)),
      attackerCombatBonus: cs.attackerCombatBonus,
      defenderCombatBonus: cs.defenderCombatBonus,
      attackerCityDefenseBonus: cs.attackerCityDefenseBonus,
      defenderCityDefenseBonus: cs.defenderCityDefenseBonus,
      originalMoverId: cs.originalMoverId!,
      attackerRoleId: cs.attackerRoleId!,
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
      cs.phase = 'scoring';
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
      const targetPos = state.combatState.targetTilePosition;
      const winner = winnerId ? state.players.find((p) => p.id === winnerId) : null;
      const loser = loserId ? state.players.find((p) => p.id === loserId) : null;
      const mover = moverId ? state.players.find((p) => p.id === moverId) : null;
      
      if (!targetPos) {
        state.combatState = { ...initialCombatState };
        return;
      }

      // 전리품 지급
      if (winner && state.combatState.lootSelections.length > 0) {
        for (const loot of state.combatState.lootSelections) {
          if (loot.type === 'trade') {
            winner.resources.trade = Math.min(27, winner.resources.trade + loot.amount);
          } else {
            winner.resources.culture += loot.amount;
          }
        }
      }

      // 묘지 처리
      const graveyardIds = new Set(state.combatState.graveyard.map((c) => c.id));
      if (winner) {
        winner.armyCards = winner.armyCards.filter((c) => !graveyardIds.has(c.id));
      }
      if (loser) {
        loser.armyCards = loser.armyCards.filter((c) => !graveyardIds.has(c.id));
      }

      const targetTile = state.map.tiles[targetPos.y][targetPos.x];
      
      // 공격자 승리
      if (mover && winnerId === moverId) {
        const originalDefenderId = state.combatState.originalDefenderId;
        const defenderPlayer = state.players.find((p) => p.id === originalDefenderId);
        
        // 방어 유닛 제거
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
        
        if (state.combatState.combatType === 'capital') {
          state.winner = moverId;
          state.winCondition = 'military';
          state.isGameOver = true;
        }

      } else if (mover && winnerId !== moverId) {
        // 방어자 승리
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
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false, hasResearchedThisTurn: false
            });
        }
        if (!state.players.find(p => p.id === devDefenderId)) {
            state.players.push({
                id: devDefenderId, name: 'DEV Defender', color: 'blue', nation: 'china',
                resources: createInitialResources(), cities: [], units: [], armyCards: [], technologies: [], 
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false, hasResearchedThisTurn: false
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
          log: [],
        };
    });
  },
});