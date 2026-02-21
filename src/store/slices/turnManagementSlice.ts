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
      
      // 맵 전체 타일의 마비 상태 해제
      state.map.tiles.forEach(row => {
          row.forEach(tile => {
              tile.isParalyzed = false;
          });
      });

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
    let shouldEndTurn = false; // 🌟 턴 종료 플래그 추가
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    
    set((state) => {
      state.phaseComplete[state.currentPlayerIndex] = true;
      const playerOrder = getPlayerOrder(state.firstPlayerIndex, state.players.length);
      const currentOrderIndex = playerOrder.indexOf(state.currentPlayerIndex);
      const nextOrderIndex = currentOrderIndex + 1;

      if (nextOrderIndex < playerOrder.length) {
        state.currentPlayerIndex = playerOrder[nextOrderIndex];
      } else {
        const currentIndex = phases.indexOf(state.currentPhase);
        if (currentIndex < phases.length - 1) {
          state.currentPhase = phases[currentIndex + 1];
          state.phaseComplete = new Array(state.players.length).fill(false);
          state.currentPlayerIndex = state.firstPlayerIndex;
          
          if (state.currentPhase === 'trade') {
            state.players.forEach((player) => { player.hasCollectedTrade = false; });
          }
          if (state.currentPhase === 'movement') {
            state.players.forEach((player) => {
              const hasFlight = player.technologies.some(t => t.id === 'flight');
              const hasSteam = player.technologies.some(t => t.id === 'steam_power');
              const hasNavigation = player.technologies.some(t => t.id === 'navigation');
              const hasHorseback = player.technologies.some(t => t.id === 'horseback_riding');

              let maxMovement = 2; 
              if (hasFlight) maxMovement = 6;
              else if (hasSteam) maxMovement = 5;
              else if (hasNavigation) maxMovement = 4;
              else if (hasHorseback) maxMovement = 3;

              player.units.forEach((unit) => {
                // 🌟 [수정] 이동력 최대치(그릇) 자체를 늘려줍니다!
                unit.maxMovement = maxMovement; 
                unit.movement = maxMovement; 
                unit.hasMoved = false;
              });
            });
          }
        } else {
          // 🌟 마지막 단계(research)까지 모두 끝났다면 라운드(Turn)를 넘겨야 합니다!
          shouldEndTurn = true; 
        }
      }
    });

    // 상태 업데이트(set)가 끝난 후 다음 라운드로 넘깁니다.
    if (shouldEndTurn) {
      // 이번 라운드에 연구된 기술이 하나라도 있다면 요약 모달 띄우기!
      if (get().turnResearchResults.length > 0) {
        get().setShowResearchResults(true);
      }
      get().endTurn();
    }
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