import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { GamePhase } from '../../types';
// 🌟 getPlayerPassives 추가
import { getPlayerOrder, getPlayerPassives, hasTechnology, hasActiveWonder, isWonderActive } from '../helpers/playerHelpers';
import { GOVERNMENTS } from '../../constants/governments';

export interface TurnManagementSlice {
  nextPhase: () => void;
  endTurn: () => void;
  endPhaseForCurrentPlayer: () => void;
  setPhaseComplete: (playerIndex: number, complete: boolean) => void;
  getPlayerOrderForCurrentRound: () => number[];
  debugSkipPhase: () => void;

  // 🌟 신규: 턴 시작 시 사용자 인터랙션이 필요한 불가사의 대기열
  pendingSydneyOperaIds: string[];
  pendingStatueOfLibertyIds: string[];
  consumePendingWonder: (playerId: string, wonder: 'sydney' | 'statue') => void;
}

export const createTurnManagementSlice: StateCreator<GameStore, [["zustand/immer", never]], [], TurnManagementSlice> = (set, get) => ({
  // 🌟 신규 상태 및 해제 함수 초기화
  pendingSydneyOperaIds: [],
  pendingStatueOfLibertyIds: [],
  consumePendingWonder: (playerId, wonder) => set((state) => {
      if (wonder === 'sydney') {
          state.pendingSydneyOperaIds = state.pendingSydneyOperaIds.filter(id => id !== playerId);
      } else {
          state.pendingStatueOfLibertyIds = state.pendingStatueOfLibertyIds.filter(id => id !== playerId);
      }
  }),
  nextPhase: () => {
    
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    set((state) => {
      state.activeCardTargeting = null;
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

          player.hasUsedEngineeringThisTurn = false;
          player.hasUsedMassMediaThisTurn = false;
          player.cities.forEach((city) => {
            city.hasActedThisTurn = false;
            city.hasHarvestedCulture = false;
            city.actionTypeThisTurn = 'none';
            city.usedProductionThisTurn = 0;
            city.producedItemsCount = 0;
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
      
      const passives = getPlayerPassives(currentPlayer); 
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
        player.hasUsedEngineeringThisTurn = false;
        player.hasUsedMassMediaThisTurn = false;
        player.hasUsedAngkorWatThisTurn = false;

        if (player.technologies) {
          player.technologies.forEach(tech => {
            tech.abilityUsedThisTurn = false;
            tech.usedPhases = [];
          });
        }

        player.cities.forEach((city) => {
          city.hasActedThisTurn = false;
          city.hasHarvestedCulture = false;
          city.tempProductionBonus = 0;
          city.actionTypeThisTurn = 'none';
          city.usedProductionThisTurn = 0;
          city.producedItemsCount = 0;
        });
      });

      // =====================================================================
      // 🌟 [추가] 차례 시작 시 불가사의 패시브 효과 일괄 적용
      // =====================================================================
      state.pendingSydneyOperaIds = [];
      state.pendingStatueOfLibertyIds = [];

      state.players.forEach(player => {
          let colossusActive = false;
          let stonehengeActive = false;
          let hangingGardensActive = false;
          let louvreActive = false;      // 🌟 루브르
          let panamaActive = false;      // 🌟 파나마
          let sydneyActive = false;      // 🌟 시드니
          let statueActive = false;      // 🌟 여신상
          let hgPos: { x: number, y: number } | undefined = undefined;

          // 🌟 TypeScript가 흐름을 인식할 수 있도록 일반 for 루프 사용
          for (let y = 0; y < state.map.height; y++) {
              for (let x = 0; x < state.map.width; x++) {
                  const tile = state.map.tiles[y][x];
                  if (tile.ownerId === player.id && tile.wonder && isWonderActive(tile, state.players)) {
                      if (tile.wonder.type === 'colossus') colossusActive = true;
                      if (tile.wonder.type === 'stonehenge') stonehengeActive = true;
                      if (tile.wonder.type === 'hanging_gardens') {
                          hangingGardensActive = true;
                          hgPos = { x, y };
                      }
                      // 🌟 신규 불가사의 스캔
                      if (tile.wonder.type === 'louvre') louvreActive = true;
                      if (tile.wonder.type === 'panama_canal') panamaActive = true;
                      if (tile.wonder.type === 'sydney_opera_house') sydneyActive = true;
                      if (tile.wonder.type === 'statue_of_liberty') statueActive = true;
                  }
              }
          }

          // 2. 거신상 효과 적용
          if (colossusActive) {
              player.resources.trade = Math.min(27, player.resources.trade + 3);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🗽 [거신상] ${player.name}이(가) 차례 시작 효과로 교역 3을 획득했습니다!` });
          }

          // 3. 스톤헨지 효과 적용
          if (stonehengeActive) {
              player.resources.culture = Math.min(50, player.resources.culture + 1);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🗿 [스톤헨지] ${player.name}이(가) 차례 시작 효과로 문화를 1 획득했습니다!` });
          }

          // 4. 공중정원 효과 적용
          if (hangingGardensActive && hgPos !== undefined) {
              const currentHgPos = hgPos; 
              const militaryCount = player.units.filter(u => u.type === 'military').length;
              
              if (militaryCount < 6) {
                  const pPassives = getPlayerPassives(player);
                  const stackingLimit = 2 + pPassives.stackingLimitBonus;
                  const tileUnitCount = state.map.tiles[currentHgPos.y][currentHgPos.x].unitIds.filter(id => player.units.some(u => u.id === id)).length;

                  if (tileUnitCount < stackingLimit) {
                      const newUnitId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
                      // 🌟 Unit 인터페이스의 모든 필수 속성을 포함 (ownerId, strength, canAttack)
                      player.units.push({
                          id: newUnitId, 
                          type: 'military', 
                          ownerId: player.id, //
                          position: { x: currentHgPos.x, y: currentHgPos.y },
                          maxMovement: pPassives.maxMovement, 
                          movement: pPassives.maxMovement, 
                          strength: 1, //
                          hasMoved: false,
                          canAttack: true //
                      });
                      state.map.tiles[currentHgPos.y][currentHgPos.x].unitIds.push(newUnitId);
                      if (!state.combatState.log) state.combatState.log = [];
                      state.combatState.log.push({ message: `🌿 [공중정원] ${player.name}의 타일에 군사 유닛이 생성되었습니다!` });
                  }
              }
          }
          
          // 5. 피라미드 상실 검사 및 체제 원복
          const hasPyramids = hasActiveWonder(player.id, 'pyramids', state.map, state.players);
          if (!hasPyramids && player.government !== 'anarchy' && player.government !== 'despotism') {
              const govDef = GOVERNMENTS[player.government as keyof typeof GOVERNMENTS];
              if (govDef && govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
                  player.government = 'despotism';
                  if (!state.combatState.log) state.combatState.log = [];
                  state.combatState.log.push({ message: `⚠️ [피라미드 상실] ${player.name}의 정치체제가 전제군주제로 강제 회귀했습니다!` });
              }
          }
          // === 🌟 신규 중세/현대 불가사의 로직 추가 ===
          if (louvreActive) {
              player.resources.culture = Math.min(50, player.resources.culture + 3);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🏛️ [루브르 박물관] ${player.name} 차례 시작 효과로 문화 3 획득!` });
          }
          if (panamaActive) {
              player.resources.currency = Math.min(15, player.resources.currency + 1);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🚢 [파나마 운하] ${player.name} 차례 시작 효과로 화폐 1 획득!` });
          }
          
          // 유저 선택이 필요한 능력들은 턴 관리자에 '대기표'를 발급합니다.
          if (sydneyActive) {
              state.pendingSydneyOperaIds.push(player.id);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🎵 [시드니 오페라 하우스] ${player.name} 문화 트랙 무료 전진 대기 중!` });
          }
          if (statueActive) {
              state.pendingStatueOfLibertyIds.push(player.id);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🗽 [자유의 여신상] ${player.name} 기술 무료 획득 대기 중!` });
          }
      });
      // =====================================================================
    });
    
    // 승리 조건 체크
    get().checkVictory();
  },

  endPhaseForCurrentPlayer: () => {
    let shouldEndTurn = false; 
    const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
    
    set((state) => {
      
      state.activeCardTargeting = null;
      // 연소 기술: 이동 단계 종료 시 적 교외 건물 파괴 검사
      if (state.currentPhase === 'movement') {
          const currentPlayer = state.players[state.currentPlayerIndex];
          if (hasTechnology(currentPlayer, 'combustion')) {
              let destroyedSomething = false;
              
              currentPlayer.units.filter(u => u.type === 'military').forEach(unit => {
                  const tile = state.map.tiles[unit.position.y][unit.position.x];
                  
                  // 내 타일이 아니고, 주인이 있으며, 건물이 있고, 도시 중심(cityId)은 아닐 때
                  if (tile.ownerId && tile.ownerId !== currentPlayer.id && tile.buildingType && !tile.cityId) {
                      const enemy = state.players.find(p => p.id === tile.ownerId);
                      if (enemy) {
                          enemy.cities.forEach(city => {
                              const bIdx = city.buildings.findIndex(b => b.tilePosition?.x === unit.position.x && b.tilePosition?.y === unit.position.y);
                              if (bIdx !== -1) city.buildings.splice(bIdx, 1);
                          });
                      }
                      tile.buildingType = null; // 타일에서 건물 철거
                      destroyedSomething = true;
                  }
              });
              
              if (destroyedSomething) {
                  alert(`🔥 [연소] 기술 효과! ${currentPlayer.name}의 군대가 이동을 마치며 적 교외 건물을 파괴했습니다!`);
              }
          }
      }
      
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