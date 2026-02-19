import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { GamePhase } from '../../types';
import { getPlayerOrder } from '../helpers/playerHelpers';

export interface TurnManagementSlice {
  nextPhase: () => void;
  endTurn: () => void;
  endPhaseForCurrentPlayer: () => void;
  setPhaseComplete: (playerIndex: number, complete: boolean) => void;
  getPlayerOrderForCurrentRound: () => number[];
  debugSkipPhase: () => void;
}

export const createTurnManagementSlice: StateCreator<GameStore, [["zustand/immer", never]], [], TurnManagementSlice> = (set, get) => ({
  nextPhase: () => {
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    set((state) => {
      const currentIndex = phases.indexOf(state.currentPhase);
      if (currentIndex < phases.length - 1) {
        state.currentPhase = phases[currentIndex + 1];
        state.phaseComplete = new Array(state.players.length).fill(false);
        state.currentPlayerIndex = state.firstPlayerIndex;
        if (state.currentPhase === 'trade') {
          state.players.forEach((player) => {
            player.hasCollectedTrade = false;
            
          });
        }
        if (state.currentPhase === 'movement') {
          state.players.forEach((player) => {
            player.units.forEach((unit) => {
              unit.movement = unit.maxMovement;
              unit.hasMoved = false;
            });
          });
        }
      }
    });
  },

  debugSkipPhase: () => {
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    set((state) => {
      const currentIndex = phases.indexOf(state.currentPhase);
      if (state.currentPhase === 'research') {
        // 연구 단계에서 스킵하면 다음 턴으로
        state.turn += 1;
        state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.players.length;
        state.currentPlayerIndex = state.firstPlayerIndex;
        state.currentPhase = 'start';
        state.phaseComplete = new Array(state.players.length).fill(false);
        state.players.forEach((player) => {
          player.cities.forEach((city) => {
            city.hasActedThisTurn = false;
          });
        });
      } else {
        state.currentPhase = phases[currentIndex + 1];
        state.phaseComplete = new Array(state.players.length).fill(false);
        state.currentPlayerIndex = state.firstPlayerIndex;
        if (state.currentPhase === 'trade') {
          state.players.forEach((player) => {
            player.hasCollectedTrade = false;
          });
        }
        if (state.currentPhase === 'movement') {
          state.players.forEach((player) => {
            player.units.forEach((unit) => {
              unit.movement = unit.maxMovement;
              unit.hasMoved = false;
            });
          });
        }
      }
    });
  },

  endTurn: () => {
    set((state) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // 생산 진행
      currentPlayer.cities.forEach((city) => {
        if (city.currentProduction) {
          city.productionProgress += city.production;
          if (city.productionProgress >= city.currentProduction.cost) {
            city.productionProgress = 0;
            city.currentProduction = null;
            city.tempProductionBonus = 0;
          }
        }
      });

      // 자원 및 턴 처리
      currentPlayer.resources.trade = Math.min(27, currentPlayer.resources.trade);
      currentPlayer.cultureTrack ;
      currentPlayer.units.forEach((unit) => {
        unit.movement = unit.maxMovement;
        unit.hasMoved = false;
      });

      state.turn += 1;
      state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.players.length;
      state.currentPlayerIndex = state.firstPlayerIndex;
      state.currentPhase = 'start';
      state.phaseComplete = new Array(state.players.length).fill(false);
      state.players.forEach((player) => {
        player.hasResearchedThisTurn = false;
        player.cities.forEach((city) => {
          city.hasActedThisTurn = false;
          city.tempProductionBonus = 0;
        });
      });
    });
    get().checkVictory();
  },

  endPhaseForCurrentPlayer: () => {
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    set((state) => {
      state.phaseComplete[state.currentPlayerIndex] = true;
      const playerOrder = getPlayerOrder(state.firstPlayerIndex, state.players.length);
      const currentOrderIndex = playerOrder.indexOf(state.currentPlayerIndex);
      const nextOrderIndex = currentOrderIndex + 1;

      if (nextOrderIndex < playerOrder.length) {
        state.currentPlayerIndex = playerOrder[nextOrderIndex];
      } else {
        // 모든 플레이어가 페이즈 종료
        if (state.currentPhase === 'research') {
          state.showResearchResults = true;
          for (const player of state.players) {
            const hasResult = state.turnResearchResults.some((r) => r.playerId === player.id);
            if (!hasResult) {
              state.turnResearchResults.push({
                playerId: player.id,
                playerName: player.name,
                techId: null,
                techName: null,
              });
            }
          }
        }
        
        const currentIndex = phases.indexOf(state.currentPhase);
        if (currentIndex < phases.length - 1) {
          state.currentPhase = phases[currentIndex + 1];
          state.phaseComplete = new Array(state.players.length).fill(false);
          state.currentPlayerIndex = state.firstPlayerIndex;
          if (state.currentPhase === 'trade') {
            state.players.forEach((player) => {
              player.hasCollectedTrade = false;
            });
          }
          if (state.currentPhase === 'movement') {
            state.players.forEach((player) => {
              player.units.forEach((unit) => {
                unit.movement = unit.maxMovement;
                unit.hasMoved = false;
              });
            });
          }
        }
      }
    });
  },

  getPlayerOrderForCurrentRound: () => {
    const { firstPlayerIndex, players } = get();
    return getPlayerOrder(firstPlayerIndex, players.length);
  },

  setPhaseComplete: (playerIndex: number, complete: boolean) => {
    set((state) => {
      state.phaseComplete[playerIndex] = complete;
    });
  },
});