// src/store/slices/unitSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, UnitType, createUnit, BASE_STACKING_LIMIT, RewardType, UNIT_DEFINITIONS } from '../../types';
import { findPlayerById } from '../helpers/playerHelpers';
import { getPlayerPassives } from '../helpers/playerHelpers';
import { calculateDetailedCityProduction } from '../../engine/ResourceCalculator';
import { calculateTileYield } from '../../engine/ResourceCalculator';
import { canLearnTechInPyramid } from '../helpers/validationHelpers';

export interface UnitSlice {
  createUnit: (playerId: string, type: UnitType, position: Position, sourceCityId?: string) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;
  exploreChunk: (unitId: string, targetChunkPos: Position) => void;
  claimObjectReward: (playerId: string, reward: RewardType) => void;
  sendPioneerTileToCity: (pioneerId: string, cityId: string) => void;
}

export const createUnitSlice: StateCreator<GameStore, [["zustand/immer", never]], [], UnitSlice> = (set, get) => ({
  createUnit: (playerId: string, type: UnitType, position: Position, sourceCityId?: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      
      let cityToUpdate = null;
      let cost = 0;

      if (state.currentPhase === 'cityManagement') {
        const city = sourceCityId 
            ? player.cities.find((c) => c.id === sourceCityId)
            : player.cities.find((c) => c.position.x === position.x && c.position.y === position.y);
            
        if (!city) return;

        if (city.actionTypeThisTurn === 'harvest') return;

        const currentProduced = city.producedItemsCount || 0;
        const hasEngineering = player.technologies.some(t => t.id === 'engineering');
        if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
        if (currentProduced >= 2) return;

        cost = UNIT_DEFINITIONS[type].productionCost;
        const totalCityProduction = calculateDetailedCityProduction(city, state.map, player).total;
        const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);

        if (availableProduction < cost) return;

        cityToUpdate = city;
      }
      
      const militaryCount = player.units.filter((u) => u.type === 'military').length;
      const settlerCount = player.units.filter((u) => u.type === 'settler').length;
      if (type === 'military' && militaryCount >= 6) return;
      if (type === 'settler' && settlerCount >= 2) return;
      
      const unit = createUnit(uuidv4(), type, playerId, position);
      player.units.push(unit);
      state.map.tiles[position.y][position.x].unitIds.push(unit.id);
      
      if (cityToUpdate) {
        cityToUpdate.usedProductionThisTurn = (cityToUpdate.usedProductionThisTurn || 0) + cost;
        cityToUpdate.producedItemsCount = (cityToUpdate.producedItemsCount || 0) + 1;
        cityToUpdate.actionTypeThisTurn = 'produce';
        if (cityToUpdate.producedItemsCount === 2) {
            player.hasUsedEngineeringThisTurn = true;
        }
        cityToUpdate.hasActedThisTurn = true;
      }
    });
  },

  exploreChunk: (unitId: string, targetChunkPos: Position) => {
    set((state) => {
      const player = state.players.find((p) => p.id === state.players[state.currentPlayerIndex].id);
      if (!player) return;

      const unit = player.units.find((u) => u.id === unitId);
      if (!unit || unit.movement < 1) return;

      unit.movement -= 1;
      if (unit.movement <= 0) unit.hasMoved = true;

      const startX = targetChunkPos.x * 4;
      const startY = targetChunkPos.y * 4;

      for (let y = startY; y < startY + 4; y++) {
        for (let x = startX; x < startX + 4; x++) {
          if (y >= 0 && y < state.map.height && x >= 0 && x < state.map.width) {
            state.map.tiles[y][x].isExplored = true;
          }
        }
      }
    });
  },

  moveUnit: (unitId: string, newPosition: Position) => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    const unit = currentPlayer.units.find((u) => u.id === unitId);
    if (!unit) return;
    if (unit.movement <= 0) return;
    
    const dx = Math.abs(newPosition.x - unit.position.x);
    const dy = Math.abs(newPosition.y - unit.position.y);
    if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return;
    
    const targetTile = state.map.tiles[newPosition.y][newPosition.x];

    const passives = getPlayerPassives(currentPlayer);
    if (!passives.ignoreTerrain) { 
      if (targetTile.terrain === 'water') {
        if (!passives.waterMovement) {
          get().addToast("물 타일로 이동하려면 '항해술' 이상의 이동 기술이 필요합니다.","info");
          return;
        }
        if (!passives.waterStop && unit.movement === 1) {
          get().addToast("물 타일에서 이동을 마칠 수 없습니다. ('범선항해술' 이상의 기술 필요)","warning");
          return;
        }
      }
    }
    
    let enemyPlayerId: string | null = null;
    for (const enemyUnitId of targetTile.unitIds) {
      for (const player of state.players) {
        if (player.id !== currentPlayer.id) {
          const enemyUnit = player.units.find((u) => u.id === enemyUnitId);
          if (enemyUnit) {
            enemyPlayerId = player.id;
            break;
          }
        }
      }
      if (enemyPlayerId) break;
    }
    
    if (!enemyPlayerId && targetTile.cityId) {
      for (const player of state.players) {
        if (player.id !== currentPlayer.id) {
          const enemyCity = player.cities.find((c) => c.id === targetTile.cityId);
          if (enemyCity) {
            enemyPlayerId = player.id;
            break;
          }
        }
      }
    }

    // 🌟 [추가] 민주주의 체제 페널티: 타 문명 도시/수도 타일 공격 불가 방어막
    let isEnemyCity = false;
    if (targetTile.cityId) {
      isEnemyCity = state.players.some(p => p.id !== currentPlayer.id && p.cities.some(c => c.id === targetTile.cityId));
    }
    if (isEnemyCity && currentPlayer.government === 'democracy') {
      get().addToast("🕊️ 민주주의 체제에서는 타 문명의 도시나 수도를 무력으로 선제 공격할 수 없습니다.","info");
      return; // 이동 및 전투 취소
    }
    
    // 🌟 러시아 특성: 적 도시에 진입 시 기술 도용 체크
    if (enemyPlayerId && targetTile.cityId) {
      if (currentPlayer.nation === 'russia' && !currentPlayer.hasUsedRussiaTechStealThisTurn) {
        const enemyPlayer = state.players.find(p => p.id === enemyPlayerId);
        if (enemyPlayer) {
          const stealableTechs = enemyPlayer.technologies.filter(t => 
            !currentPlayer.technologies.some(myT => myT.id === t.id) && 
            canLearnTechInPyramid(currentPlayer, t.id).canResearch
          );

          if (stealableTechs.length > 0) {
            get().setRussiaStealPrompt({ unitId, targetPlayerId: enemyPlayer.id, targetPos: newPosition });
            return; 
          } else {
            get().addToast("상대에게 도용할 수 있는 기술이 없어 바로 전투에 돌입합니다.","info");
          }
        }
      }
    }
    
    if (enemyPlayerId) {
      if (unit.type === 'settler') return; 
      
      set((s) => {
        if (!s.selectedUnits.includes(unitId)) {
          s.selectedUnits = [unitId];
        }
      });
      get().startCombat(currentPlayer.id, newPosition);
      return;
    }

    if (targetTile.object) {
        const obj = targetTile.object;
        if (obj.type === 'hut') {
            const isMilitary = unit.type === 'military';
            const isSettler = unit.type === 'settler';
            const isRepublic = currentPlayer.government === 'republic';

            if (isMilitary || (isSettler && isRepublic)) {
                set(s => {
                    const p = s.players.find(pl => pl.id === currentPlayer.id);
                    const u = p?.units.find(un => un.id === unitId);
                    if (p && u) {
                        if (p.nation === 'china') {
                            p.resources.culture += 3;
                            if (!s.combatState.log) s.combatState.log = [];
                            s.combatState.log.push({ message: `🐉 [중국 특성] 오두막을 발견하여 문화 3개를 획득했습니다!` });
                        }
                        if (obj.reward.type === 'resource') {
                            if (!p.secretResources) p.secretResources = [];
                            p.secretResources.push({
                                id: uuidv4(),
                                type: obj.reward.resource as any,
                                source: 'hut'
                            });
                        } else if (obj.reward.type === 'spy') p.spies += 1;
                        else if (obj.reward.type === 'greatPerson') p.greatPeople += 1;
                        else if (obj.reward.type === 'nuclear') p.nuclearMaterial += 1;

                        s.map.tiles[newPosition.y][newPosition.x].object = undefined;
                        
                        const oldTile = s.map.tiles[u.position.y][u.position.x];
                        oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
                        s.map.tiles[newPosition.y][newPosition.x].unitIds.push(unitId);
                        
                        u.position = newPosition;
                        u.movement = 0; 
                        u.hasMoved = true;
                    }
                });
                return;
            } else {
                get().addToast("오두막은 군사 유닛 또는 공화제일 때의 개척자만 진입할 수 있습니다.","info");
                return; 
            }
        }

        if (obj.type === 'village') {
            if (unit.type !== 'military') {
                get().addToast("마을은 군사 유닛으로만 진입할 수 있습니다.","info");
                return;
            }
            get().startVillageCombat(unitId, newPosition);
            return; 
        }
    }

    set((s) => {
      for (const player of s.players) {
        const u = player.units.find((u) => u.id === unitId);
        if (u) {
          const tile = s.map.tiles[newPosition.y][newPosition.x];
          const stackingLimit = BASE_STACKING_LIMIT + passives.stackingLimitBonus;
          const myUnitsOnTile = tile.unitIds.filter((id) =>
            player.units.some((unit) => unit.id === id)
          ).length;
          
          if (myUnitsOnTile >= stackingLimit) return;
          
          const oldTile = s.map.tiles[u.position.y][u.position.x];
          oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);
          u.position = newPosition;
          u.movement -= 1;
          if (u.movement <= 0) {
            u.hasMoved = true;
          }
          tile.unitIds.push(unitId);
          break;
        }
      }
    });
  },

  removeUnit: (unitId: string) => {
    set((state) => {
      for (const player of state.players) {
        const unitIndex = player.units.findIndex((u) => u.id === unitId);
        if (unitIndex !== -1) {
          const unit = player.units[unitIndex];
          const tile = state.map.tiles[unit.position.y][unit.position.x];
          tile.unitIds = tile.unitIds.filter((id) => id !== unitId);
          player.units.splice(unitIndex, 1);
          break;
        }
      }
    });
  },

  moveSelectedUnits: (newPosition: Position) => {
    const currentState = get();
    const player = currentState.players[currentState.currentPlayerIndex];
    const firstSelectedUnit = currentState.selectedUnits
      .map((id) => player.units.find((u) => u.id === id))
      .find((u) => u !== undefined);
      
    if (firstSelectedUnit) {
      const dx = Math.abs(newPosition.x - firstSelectedUnit.position.x);
      const dy = Math.abs(newPosition.y - firstSelectedUnit.position.y);
      if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return;
    }
    
    const targetTile = currentState.map.tiles[newPosition.y][newPosition.x];
    let enemyPlayerId: string | null = null;
    
    for (const enemyUnitId of targetTile.unitIds) {
      for (const p of currentState.players) {
        if (p.id !== player.id) {
          const enemyUnit = p.units.find((u) => u.id === enemyUnitId);
          if (enemyUnit) {
            enemyPlayerId = p.id;
            break;
          }
        }
      }
      if (enemyPlayerId) break;
    }
    if (!enemyPlayerId && targetTile.cityId) {
      for (const p of currentState.players) {
        if (p.id !== player.id) {
          const enemyCity = p.cities.find((c) => c.id === targetTile.cityId);
          if (enemyCity) {
            enemyPlayerId = p.id;
            break;
          }
        }
      }
    }

    // 🌟 [추가] 민주주의 체제 페널티: 타 문명 도시/수도 타일 공격 불가 방어막 (다중 선택 이동 시)
    let isEnemyCity = false;
    if (targetTile.cityId) {
      isEnemyCity = currentState.players.some(p => p.id !== player.id && p.cities.some(c => c.id === targetTile.cityId));
    }
    if (isEnemyCity && player.government === 'democracy') {
      get().addToast("🕊️ 민주주의 체제에서는 타 문명의 도시나 수도를 무력으로 선제 공격할 수 없습니다.","warning");
      return; // 이동 및 전투 취소
    }
    
    if (enemyPlayerId) {
      get().startCombat(player.id, newPosition);
      return;
    }

    const unitsToMove = currentState.selectedUnits
      .map((id) => player.units.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined && u.movement > 0);

    if (unitsToMove.length === 0) return;

    if (targetTile.object) {
      const obj = targetTile.object;
      const hasMilitary = unitsToMove.some(u => u.type === 'military');
      const hasSettler = unitsToMove.some(u => u.type === 'settler');
      const isRepublic = player.government === 'republic';

      if (obj.type === 'hut') {
          if (!hasMilitary && !(hasSettler && isRepublic)) {
              get().addToast("오두막은 군사 유닛 또는 공화제일 때의 개척자만 진입할 수 있습니다.","info");
              return;
          }
      } else if (obj.type === 'village') {
          if (!hasMilitary) {
              get().addToast("마을은 군사 유닛이 포함되어야 진입할 수 있습니다.","info");
              return;
          }
          const militaryUnit = unitsToMove.find(u => u.type === 'military')!;
          get().startVillageCombat(militaryUnit.id, newPosition);
          return;
      }
    }
    
    set((state) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const tile = state.map.tiles[newPosition.y][newPosition.x];
      const passives = getPlayerPassives(currentPlayer); 
      const unitsToMove = state.selectedUnits
        .map((id) => currentPlayer.units.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => u !== undefined && u.movement > 0);
        
      if (unitsToMove.length === 0) return;
      
      const firstUnit = unitsToMove[0];
      const allOnSameTile = unitsToMove.every(
        (u) => u.position.x === firstUnit.position.x && u.position.y === firstUnit.position.y
      );
      if (!allOnSameTile) return;
      
      const stackingLimit = BASE_STACKING_LIMIT + passives.stackingLimitBonus;
      const myUnitsOnTarget = tile.unitIds.filter((id) =>
        currentPlayer.units.some((u) => u.id === id)
      ).length;
      const maxMovable = stackingLimit - myUnitsOnTarget;
      const actualMovingUnits = unitsToMove.slice(0, Math.max(0, maxMovable));
      
      if (actualMovingUnits.length === 0) return;
      
      let claimedHut = false; 

      if (tile.object && tile.object.type === 'hut') {
          claimedHut = true; 
          const obj = tile.object;
          if (currentPlayer.nation === 'china') {
              currentPlayer.resources.culture += 3;
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🐉 [중국 특성] 오두막을 발견하여 문화 3개를 획득했습니다!` });
          }
          if (obj.reward.type === 'resource') {
              if (!currentPlayer.secretResources) currentPlayer.secretResources = [];
              currentPlayer.secretResources.push({
                  id: uuidv4(),
                  type: obj.reward.resource as any,
                  source: 'hut'
              });
          } else if (obj.reward.type === 'spy') currentPlayer.spies += 1;
          else if (obj.reward.type === 'greatPerson') currentPlayer.greatPeople += 1;
          else if (obj.reward.type === 'nuclear') currentPlayer.nuclearMaterial += 1;

          tile.object = undefined;
      }
      
      for (const unit of actualMovingUnits) {
        const oldTile = state.map.tiles[unit.position.y][unit.position.x];
        oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unit.id);
        unit.position = newPosition;
        
        if (claimedHut) {
            unit.movement = 0;
        } else {
            unit.movement -= 1;
        }
        
        if (unit.movement <= 0) {
          unit.hasMoved = true;
        }
        tile.unitIds.push(unit.id);
      }
    });
  },

  claimObjectReward: (playerId, reward) => {
      set(state => {
          const player = state.players.find(p => p.id === playerId);
          if (!player) return;
          if (reward.type === 'resource') {
              if (!player.secretResources) player.secretResources = [];
              player.secretResources.push({
                  id: uuidv4(),
                  type: reward.resource as any,
                  source: 'hut'
              });
          } else if (reward.type === 'spy') player.spies += 1;
          else if (reward.type === 'greatPerson') player.greatPeople += 1;
          else if (reward.type === 'nuclear') player.nuclearMaterial += 1;
      });
  },

  sendPioneerTileToCity: (pioneerId: string, cityId: string) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const pioneer = player.units.find(u => u.id === pioneerId);
      const city = player.cities.find(c => c.id === cityId);

      if (!pioneer || !city) return;

      const tile = state.map.tiles[pioneer.position.y][pioneer.position.x];
      const tileYield = calculateTileYield(tile, state.players);

      city.pioneerProductionBonus = tileYield.production || 0;
      city.pioneerTradeBonus = tileYield.trade || 0;
      
      city.pioneerLinkedLuxuries = [];
      if (tile.resource) {
          city.pioneerLinkedLuxuries.push(tile.resource);
      }

      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ 
          message: `⛺ [보급] 개척자가 타일의 자원(생산+${city.pioneerProductionBonus}, 교역+${city.pioneerTradeBonus})을 ${city.name}에 전송했습니다!` 
      });
    });
  },
});