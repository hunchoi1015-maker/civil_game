// src/store/slices/unitSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, UnitType, createUnit, BASE_STACKING_LIMIT, RewardType, UNIT_DEFINITIONS } from '../../types';
import { findPlayerById } from '../helpers/playerHelpers';
import { getPlayerPassives } from '../helpers/playerHelpers';
import { calculateDetailedCityProduction } from '../../engine/ResourceCalculator';
import { calculateTileYield } from '../../engine/ResourceCalculator';

export interface UnitSlice {
  // 🌟 [수정] 4번째 파라미터(sourceCityId) 추가!
  createUnit: (playerId: string, type: UnitType, position: Position, sourceCityId?: string) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;
  exploreChunk: (unitId: string, targetChunkPos: Position) => void;
  claimObjectReward: (playerId: string, reward: RewardType) => void;
  sendPioneerTileToCity: (pioneerId: string, cityId: string) => void;
}

export const createUnitSlice: StateCreator<GameStore, [["zustand/immer", never]], [], UnitSlice> = (set, get) => ({
  // 🌟 [수정] 4번째 파라미터(sourceCityId) 추가!
  createUnit: (playerId: string, type: UnitType, position: Position, sourceCityId?: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      
      let cityToUpdate = null;
      let cost = 0;

      if (state.currentPhase === 'cityManagement') {
        // 🌟 [수정] sourceCityId가 있다면 그 도시를 찾고, 없다면 타일 위치로 찾습니다.
        const city = sourceCityId 
            ? player.cities.find((c) => c.id === sourceCityId)
            : player.cities.find((c) => c.position.x === position.x && c.position.y === position.y);
            
        if (!city) return;

        // 1. 행동 충돌 방지
        if (city.actionTypeThisTurn === 'harvest') return;

        // 2. 공학 능력 및 횟수 한도 체크
        const currentProduced = city.producedItemsCount || 0;
        const hasEngineering = player.technologies.some(t => t.id === 'engineering');
        if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
        if (currentProduced >= 2) return;

        // 3. 잔여 생산력 검사
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
          alert("물 타일로 이동하려면 '항해술' 기술이 필요합니다.");
          return;
        }
        if (!passives.waterStop && unit.movement === 1) {
          alert("물 타일에서 이동을 마칠 수 없습니다. ('범선항해술' 기술 필요)");
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
                        if (obj.reward.type === 'resource') {
                            // 🌟 신규: 일반 주머니가 아닌 비밀 자원(오두막) 주머니에 추가!
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
                alert("오두막은 군사 유닛 또는 공화제일 때의 개척자만 진입할 수 있습니다.");
                return; 
            }
        }

        if (obj.type === 'village') {
            if (unit.type !== 'military') {
                alert("마을은 군사 유닛으로만 진입할 수 있습니다.");
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
    
    if (enemyPlayerId) {
      get().startCombat(player.id, newPosition);
      return;
    }
    
    set((state) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const tile = state.map.tiles[newPosition.y][newPosition.x];
      const passives = getPlayerPassives(currentPlayer); // 🌟 동적 패시브 계산
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
      
      for (const unit of actualMovingUnits) {
        const oldTile = state.map.tiles[unit.position.y][unit.position.x];
        oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unit.id);
        unit.position = newPosition;
        unit.movement -= 1;
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
              // 🌟 신규: 비밀 자원(오두막)으로 추가!
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

  // 🌟 [추가] 개척자 보급 스킬 구현부
  sendPioneerTileToCity: (pioneerId: string, cityId: string) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const pioneer = player.units.find(u => u.id === pioneerId);
      const city = player.cities.find(c => c.id === cityId);

      if (!pioneer || !city) return;

      const tile = state.map.tiles[pioneer.position.y][pioneer.position.x];
      
      // 🌟 calculateTileYield를 사용하여 실제 타일의 자원 산출량을 가져옵니다.
      const tileYield = calculateTileYield(tile, state.players);

      // 🌟 1. 생산력과 교역 복사
      city.pioneerProductionBonus = tileYield.production || 0;
      city.pioneerTradeBonus = tileYield.trade || 0;
      
      // 🌟 2. 사치품 접근권(Link) 복사
      city.pioneerLinkedLuxuries = [];
      if (tile.resource) {
          city.pioneerLinkedLuxuries.push(tile.resource);
      }

      // 전투/액션 로그에 기록
      //if (!state.combatState) state.combatState = { log: [] }; // 방어 로직
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ 
          message: `⛺ [보급] 개척자가 타일의 자원(생산+${city.pioneerProductionBonus}, 교역+${city.pioneerTradeBonus})을 ${city.name}에 전송했습니다!` 
      });

    });
  },
});