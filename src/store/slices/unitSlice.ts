import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, UnitType, createUnit, BASE_STACKING_LIMIT } from '../../types';
import { findPlayerById } from '../helpers/playerHelpers';

export interface UnitSlice {
  createUnit: (playerId: string, type: UnitType, position: Position) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;
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
    
    set((s) => {
      for (const player of s.players) {
        const u = player.units.find((u) => u.id === unitId);
        if (u) {
          const tile = s.map.tiles[newPosition.y][newPosition.x];
          const stackingLimit = BASE_STACKING_LIMIT + player.stackingLimitBonus;
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
});