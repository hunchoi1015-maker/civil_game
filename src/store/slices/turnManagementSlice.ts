import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { GamePhase } from '../../types';
// 🌟 getPlayerPassives 추가
import { getPlayerOrder, getPlayerPassives } from '../helpers/playerHelpers';

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
        // 페이즈 넘어가기 전 체크 사항
        state.players.forEach(player => {
            // 1. 시작 단계를 넘어가면, 체제 무료 전환 기회(유효기간) 증발!
            if (state.currentPhase === 'start') {
                player.freeGovernmentSwitch = false; 
            }
            // 2. 도시 경영 단계가 시작될 때 무정부 상태라면 수도 봉쇄!
            if (phases[currentIndex + 1] === 'cityManagement' && player.government === 'anarchy') {
                const capital = player.cities.find(c => c.isCapital);
                if (capital) capital.hasActedThisTurn = true; // 강제로 행동 완료 처리
            }
        });

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
            const passives = getPlayerPassives(player); // 🌟 동적 패시브 적용
            player.units.forEach((unit) => {
              unit.maxMovement = passives.maxMovement;
              unit.movement = passives.maxMovement;
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
            city.hasHarvestedCulture = false;
          });
        });
      } else {
        state.players.forEach(player => {
            if (state.currentPhase === 'start') player.freeGovernmentSwitch = false; 
            if (phases[currentIndex + 1] === 'cityManagement' && player.government === 'anarchy') {
                const capital = player.cities.find(c => c.isCapital);
                if (capital) capital.hasActedThisTurn = true;
            }
        });
        
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
            const passives = getPlayerPassives(player); // 🌟 동적 패시브 적용
            player.units.forEach((unit) => {
              unit.maxMovement = passives.maxMovement;
              unit.movement = passives.maxMovement;
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
      
      // 2. 자원 및 턴 처리
      currentPlayer.resources.trade = Math.min(27, currentPlayer.resources.trade);
      
      const passives = getPlayerPassives(currentPlayer); // 🌟 동적 패시브 적용
      currentPlayer.units.forEach((unit) => {
        unit.maxMovement = passives.maxMovement;
        unit.movement = passives.maxMovement;
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
            tech.usedPhases = [];
          });
        }

        // 플레이어의 도시 행동 초기화
        player.cities.forEach((city) => {
          city.hasActedThisTurn = false;
          city.hasHarvestedCulture = false;
          city.tempProductionBonus = 0;
        });
      });
    });
    
    // 승리 조건 체크
    get().checkVictory();
  },

  endPhaseForCurrentPlayer: () => {
    let shouldEndTurn = false; 
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
          
          // 실제 게임 진행 중 페이즈가 넘어갈 때 체크!
          state.players.forEach(player => {
              if (state.currentPhase === 'start') {
                  player.freeGovernmentSwitch = false; 
              }
              if (phases[currentIndex + 1] === 'cityManagement' && player.government === 'anarchy') {
                  const capital = player.cities.find(c => c.isCapital);
                  if (capital) capital.hasActedThisTurn = true; // 수도 강제 행동 완료 처리!
              }
          });
          // ==========================================

          state.currentPhase = phases[currentIndex + 1];
          state.phaseComplete = new Array(state.players.length).fill(false);
          state.currentPlayerIndex = state.firstPlayerIndex;
          
          if (state.currentPhase === 'trade') {
            state.players.forEach((player) => { player.hasCollectedTrade = false; });
          }
          if (state.currentPhase === 'movement') {
            state.players.forEach((player) => {
              const passives = getPlayerPassives(player);
              player.units.forEach((unit) => {
                unit.maxMovement = passives.maxMovement; 
                unit.movement = passives.maxMovement; 
                unit.hasMoved = false;
              });
            });
          }
        } else {
          shouldEndTurn = true; 
        }
      }
    });

    if (shouldEndTurn) {
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