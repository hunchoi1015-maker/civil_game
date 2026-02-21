import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, UnitType, createUnit, BASE_STACKING_LIMIT, createInitialLuxuryResources, RewardType } from '../../types';
import { findPlayerById } from '../helpers/playerHelpers';
import { getPlayerPassives } from '../helpers/playerHelpers';

export interface UnitSlice {
  createUnit: (playerId: string, type: UnitType, position: Position) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;
  exploreChunk: (unitId: string, targetChunkPos: Position) => void;
  claimObjectReward: (playerId: string, reward: RewardType) => void;
}

export const createUnitSlice: StateCreator<GameStore, [["zustand/immer", never]], [], UnitSlice> = (set, get) => ({
  createUnit: (playerId: string, type: UnitType, position: Position) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      
      if (state.currentPhase === 'cityManagement') {
        const city = player.cities.find(
          (c) => c.position.x === position.x && c.position.y === position.y
        );
        if (city?.hasActedThisTurn) return;
      }
      
      const militaryCount = player.units.filter((u) => u.type === 'military').length;
      const settlerCount = player.units.filter((u) => u.type === 'settler').length;
      if (type === 'military' && militaryCount >= 6) return;
      if (type === 'settler' && settlerCount >= 2) return;
      
      const unit = createUnit(uuidv4(), type, playerId, position);
      player.units.push(unit);
      state.map.tiles[position.y][position.x].unitIds.push(unit.id);
      
      if (state.currentPhase === 'cityManagement') {
        const city = player.cities.find(
          (c) => c.position.x === position.x && c.position.y === position.y
        );
        if (city) city.hasActedThisTurn = true;
      }
    });
  },
  exploreChunk: (unitId: string, targetChunkPos: Position) => {
    set((state) => {
      const player = state.players.find((p) => p.id === state.players[state.currentPlayerIndex].id);
      if (!player) return;

      const unit = player.units.find((u) => u.id === unitId);
      if (!unit || unit.movement < 1) return; // 이동력 1 이상 필요

      // 이동력 소모
      unit.movement -= 1;
      if (unit.movement <= 0) unit.hasMoved = true;

      // 청크 개방 (4x4 영역)
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
    if (!passives.ignoreTerrain) { // 비행(flight)이 없을 때만 지형 검사
      
      // ❌ 산 타일(mountain) 제약 로직은 완전히 삭제했습니다!

      // 물 타일 검사는 그대로 유지
      if (targetTile.terrain === 'water') {
        if (!passives.waterMovement) {
          alert("물 타일로 이동하려면 '항해술' 기술이 필요합니다.");
          return;
        }
        // 물에서 이동을 마칠 수 없는 경우 (이동력이 1 남았을 때 물로 진입 시도)
        if (!passives.waterStop && unit.movement === 1) {
          alert("물 타일에서 이동을 마칠 수 없습니다. ('범선항해술' 기술 필요)");
          return;
        }
      }
    }
    
    let enemyPlayerId: string | null = null;
    
    // 적 유닛 체크
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
    
    // 적 도시 체크
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
      if (unit.type === 'settler') return; // 개척자는 공격 불가
      
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
        
        // 1. 오두막 (Hut)
        if (obj.type === 'hut') {
            const isMilitary = unit.type === 'military';
            const isSettler = unit.type === 'settler';
            const isRepublic = currentPlayer.government === 'republic';

            if (isMilitary || (isSettler && isRepublic)) {
                // 획득 성공 -> 이동 및 보상 지급
                // 여기서 set을 호출하여 상태 업데이트
                set(s => {
                    const p = s.players.find(pl => pl.id === currentPlayer.id);
                    const u = p?.units.find(un => un.id === unitId);
                    if (p && u) {
                        // 보상 지급 (claimObjectReward 로직 인라인 또는 호출)
                        // 여기서는 직접 로직 구현
                        if (obj.reward.type === 'resource') {
                            if (!p.luxuryResources) p.luxuryResources = createInitialLuxuryResources();
                            if (p.luxuryResources[obj.reward.resource] !== undefined) {
                                p.luxuryResources[obj.reward.resource] += 1;
                            }
                        } else if (obj.reward.type === 'spy') p.spies += 1;
                        else if (obj.reward.type === 'greatPerson') p.greatPeople += 1;
                        else if (obj.reward.type === 'nuclear') p.nuclearMaterial += 1;

                        // 객체 제거
                        s.map.tiles[newPosition.y][newPosition.x].object = undefined;
                        
                        // 유닛 이동 처리
                        const oldTile = s.map.tiles[u.position.y][u.position.x];
                        oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
                        s.map.tiles[newPosition.y][newPosition.x].unitIds.push(unitId);
                        
                        u.position = newPosition;
                        u.movement = 0; // 즉시 종료
                        u.hasMoved = true;
                    }
                });
                return;
            } else {
                alert("오두막은 군사 유닛 또는 공화제일 때의 개척자만 진입할 수 있습니다.");
                return; // 진입 불가
            }
        }

        // 2. 마을 (Village)
        if (obj.type === 'village') {
            if (unit.type !== 'military') {
                alert("마을은 군사 유닛으로만 진입할 수 있습니다.");
                return;
            }
            // 전투 시작
            get().startVillageCombat(unitId, newPosition);
            return; // 이동 중단
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
    
    // 적 체크 로직 (단일 이동과 동일)
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
      const unitsToMove = state.selectedUnits
        .map((id) => currentPlayer.units.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => u !== undefined && u.movement > 0);
        
      if (unitsToMove.length === 0) return;
      
      const firstUnit = unitsToMove[0];
      const allOnSameTile = unitsToMove.every(
        (u) => u.position.x === firstUnit.position.x && u.position.y === firstUnit.position.y
      );
      if (!allOnSameTile) return;
      
      const stackingLimit = BASE_STACKING_LIMIT + currentPlayer.stackingLimitBonus;
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
              if (!player.luxuryResources) player.luxuryResources = createInitialLuxuryResources();
              if (player.luxuryResources[reward.resource] !== undefined) {
                  player.luxuryResources[reward.resource] += 1;
              }
          } else if (reward.type === 'spy') player.spies += 1;
          else if (reward.type === 'greatPerson') player.greatPeople += 1;
          else if (reward.type === 'nuclear') player.nuclearMaterial += 1;
      });
  }
});