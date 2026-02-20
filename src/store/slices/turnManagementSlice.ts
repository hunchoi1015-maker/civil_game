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
      
      // 1. 생산 진행
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

      // 2. 자원 및 턴 처리
      currentPlayer.resources.trade = Math.min(27, currentPlayer.resources.trade);
      // currentPlayer.cultureTrack ; (이 부분은 이전 코드에 의미 없는 줄이 있어서 주석/삭제 처리했습니다)
      currentPlayer.units.forEach((unit) => {
        unit.movement = unit.maxMovement;
        unit.hasMoved = false;
      });

      // 3. 다음 턴 세팅
      state.turn += 1;
      state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.players.length;
      state.currentPlayerIndex = state.firstPlayerIndex;
      state.currentPhase = 'start';
      state.phaseComplete = new Array(state.players.length).fill(false);
      
      state.players.forEach((player) => {
        player.hasResearchedThisTurn = false;
        
        // 플레이어의 기술 스킬 초기화 (도시에 종속되지 않고 플레이어별로 1번씩만!)
        if (player.technologies) {
          player.technologies.forEach(tech => {
            tech.abilityUsedThisTurn = false;
          });
        }

        // 플레이어의 도시 행동 초기화
        player.cities.forEach((city) => {
          city.hasActedThisTurn = false;
          city.tempProductionBonus = 0;
        });
      });
    });
    
    // 승리 조건 체크
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
        // 모든 플레이어가 현재 페이즈를 종료했을 때 다음 페이즈로 넘어가는 로직
        
        // 🌟 [수정된 부분] 에러를 일으키던 옛날 showResearchResults 관련 블록을 완전히 삭제했습니다! 🌟
        
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