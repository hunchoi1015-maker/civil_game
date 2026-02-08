import { GameStore } from '../types/storeTypes';

// 플레이어 관련 선택자
export const selectCurrentPlayer = (state: GameStore) => state.players[state.currentPlayerIndex];

export const selectPlayerById = (state: GameStore, playerId: string) => 
  state.players.find(p => p.id === playerId);

// 전투 관련 선택자
export const selectCombatState = (state: GameStore) => state.combatState;
export const selectIsCombatActive = (state: GameStore) => state.combatState.isActive;

// UI 관련 선택자
export const selectSelectedUnit = (state: GameStore) => state.selectedUnit;
export const selectSelectedUnits = (state: GameStore) => state.selectedUnits;
export const selectSelectedTile = (state: GameStore) => state.selectedTile;

// 게임 상태 선택자
export const selectCurrentPhase = (state: GameStore) => state.currentPhase;
export const selectTurn = (state: GameStore) => state.turn;
export const selectIsGameOver = (state: GameStore) => state.isGameOver;
export const selectWinner = (state: GameStore) => state.winner;

// 행동 가능 여부 선택자 (Helper 래퍼)
export const selectCanPerformAction = (state: GameStore, action: 'research' | 'build' | 'move' | 'trade' | 'combat') => 
  state.canPerformAction(action);