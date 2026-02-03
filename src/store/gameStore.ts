import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GamePhase,
  GameConfig,
  Player,
  PlayerColor,
  Resources,
  GameMap,
  Tile,
  Position,
  UnitType,
  CombatState,
  ArmyCardType,
  ArmyTier,
  NationType,
  TerrainType,
  CombatType,
  getAttackerMaxCards,
  CITY_CAPITAL_MAX_CARDS,
  LOOT_MAX_PER_SELECTION,
  createInitialResources,
  createCity,
  createUnit,
  createArmyCard,
  getStartPositionOptions,
  BASE_STACKING_LIMIT,
} from '../types';
import { resolveBattlefields } from '../engine/CombatResolver';
import { TECHNOLOGIES } from '../constants/technologies';
import { NATIONS } from '../types/nation';
import { BUILDINGS } from '../constants/buildings';
import { GOVERNMENTS } from '../constants/governments';
import { calculateTradeIncome, calculateProductionCapacity } from '../engine/GameEngine';
import { calculateCityProduction, calculateCityCulture, canAffordBuilding } from '../engine/ResourceCalculator';

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

// 게임 셋업 상태
interface GameSetupState {
  phase: 'nationSelect' | 'capitalSelect' | 'ready';
  currentSetupPlayer: number;
  selectedNations: (NationType | null)[];
  capitalPositionOptions: Position[][];
}

// 이번 턴 연구 결과 (연구 단계 완료 후 표시용)
interface TurnResearchResult {
  playerId: string;
  playerName: string;
  techId: string | null;
  techName: string | null;
}

interface GameStore extends GameState {
  // 게임 셋업
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  startGame: () => void;

  // 게임 설정
  initGame: (config: GameConfig) => void;
  resetGame: () => void;

  // 턴 관리
  nextPhase: () => void;
  endTurn: () => void;
  endPhaseForCurrentPlayer: () => void;  // 순차 진행 단계에서 현재 플레이어 단계 완료
  setPhaseComplete: (playerIndex: number, complete: boolean) => void;
  getPlayerOrderForCurrentRound: () => number[];  // 현재 라운드의 플레이어 순서 반환
  debugSkipPhase: () => void;  // 디버그: 페이즈 강제 이동

  // 플레이어 액션
  updateResources: (playerId: string, resources: Partial<Resources>) => void;
  addTrade: (playerId: string, amount: number) => void;
  collectTradeIncome: (playerId: string) => boolean;  // 교역 수입 수령 (턴당 1회)
  spendTrade: (playerId: string, amount: number) => boolean;
  addCurrency: (playerId: string, amount: number) => void;
  addCulture: (playerId: string, amount: number) => void;
  changeGovernment: (playerId: string, government: string) => void;

  // 도시 관리
  foundCity: (playerId: string, position: Position, name: string) => void;
  buildInCity: (cityId: string, buildingType: string, position?: Position) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  setProduction: (cityId: string, itemType: string, itemId: string) => void;

  // 유닛 관리
  createUnit: (playerId: string, type: UnitType, position: Position) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;

  // 부대 카드 관리 (새로운 공격/체력 시스템)
  produceArmyCard: (
    playerId: string,
    type: ArmyCardType,
    tier: ArmyTier,
    attack: number,
    health: number,
    name: string,
    cityId?: string
  ) => void;
  removeArmyCard: (playerId: string, cardId: string) => void;

  // 기술 연구
  researchTech: (playerId: string, techId: string) => boolean;

  // 전투
  combatState: CombatState;
  startCombat: (moverId: string, targetPosition: Position) => void;
  placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => void;
  passTurn: (playerId: string) => void;
  resolveBattlefieldsAction: () => void;
  proceedToLoot: () => void;
  selectLoot: (choice: 'trade' | 'culture') => void;
  endCombat: () => void;

  // 맵 관리
  getTile: (position: Position) => Tile | null;
  setTileOwner: (position: Position, ownerId: string | null) => void;

  // 승리 조건
  checkVictory: () => void;

  // UI 상태
  selectedTile: Position | null;
  selectedUnit: string | null;
  selectedUnits: string[];  // 다중 유닛 선택
  setSelectedTile: (position: Position | null) => void;
  setSelectedUnit: (unitId: string | null) => void;
  setSelectedUnits: (unitIds: string[]) => void;
  toggleUnitSelection: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;  // 선택된 유닛들 동시 이동

  // 단계별 행동 가능 여부 확인
  canPerformAction: (action: 'research' | 'build' | 'move' | 'trade' | 'combat') => boolean;

  // 연구 결과 표시
  turnResearchResults: TurnResearchResult[];
  showResearchResults: boolean;
  recordResearch: (playerId: string, techId: string, techName: string) => void;
  clearResearchResults: () => void;
  setShowResearchResults: (show: boolean) => void;
}

const initialCombatState: CombatState = {
  isActive: false,
  originalMoverId: null,
  originalDefenderId: null,
  attackerRoleId: null,
  defenderRoleId: null,
  combatType: 'field',
  targetTilePosition: null,
  targetCityId: null,
  isWalledCity: false,
  rolesSwapped: false,
  attackerAvailableCards: [],
  defenderAvailableCards: [],
  battlefields: [],
  placement: {
    currentTurn: 'defender',
    attackerPassed: false,
    defenderPassed: false,
    attackerDeployCount: 0,
    defenderDeployCount: 0,
    attackerMaxCards: 0,
    defenderMaxCards: 0,
  },
  graveyard: [],
  phase: 'placement',
  attackerCombatBonus: 0,
  defenderCombatBonus: 0,
  defenderCityDefenseBonus: 0,
  attackerFinalScore: 0,
  defenderFinalScore: 0,
  winner: null,
  winnerPlayerId: null,
  loserPlayerId: null,
  lootSelections: [],
  maxLootSelections: 0,
  log: [],
};

const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
};

const createInitialState = (): Omit<
  GameState,
  'players' | 'map'
> & {
  players: Player[];
  map: GameMap;
  combatState: CombatState;
  setupState: GameSetupState;
  selectedTile: Position | null;
  selectedUnit: string | null;
  selectedUnits: string[];
  turnResearchResults: TurnResearchResult[];
  showResearchResults: boolean;
} => ({
  id: '',
  turn: 0,
  currentPhase: 'start',
  currentPlayerIndex: 0,
  firstPlayerIndex: 0,  // 선플레이어 인덱스
  players: [],
  map: { width: 0, height: 0, tiles: [] },
  winner: null,
  winCondition: null,
  isGameOver: false,
  phaseComplete: [],
  combatState: initialCombatState,
  setupState: initialSetupState,
  selectedTile: null,
  selectedUnit: null,
  selectedUnits: [],
  turnResearchResults: [],
  showResearchResults: false,
});

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    // 게임 셋업 초기화
    initSetup: (playerCount: number, playerNames: string[]) => {
      // 16x16 맵 생성
      const map = generateMap(16, 16);

      // 사용 가능한 국가 목록
      const availableNations: NationType[] = ['america', 'rome', 'egypt', 'china', 'russia', 'germany'];

      // 플레이어 생성 (국가 자동 배정)
      const players: Player[] = [];
      for (let i = 0; i < playerCount; i++) {
        players.push({
          id: uuidv4(),
          name: playerNames[i],
          color: PLAYER_COLORS[i],
          nation: availableNations[i], // 순서대로 국가 배정
          resources: createInitialResources(),
          cities: [],
          units: [],
          armyCards: [],
          technologies: [],
          government: 'despotism',
          cultureTrack: 0,
          hasCapital: false,
          isEliminated: false,
          stackingLimitBonus: 0,
          hasCollectedTrade: false,
        });
      }

      // 각 플레이어의 수도 위치 옵션 계산
      const capitalOptions: Position[][] = [];
      for (let i = 0; i < playerCount; i++) {
        capitalOptions.push(getStartPositionOptions(i, 16, 16));
      }

      set((state) => {
        state.id = uuidv4();
        state.players = players;
        state.map = map;
        state.setupState = {
          phase: 'capitalSelect', // 바로 수도 선택 단계로
          currentSetupPlayer: 0,
          selectedNations: availableNations.slice(0, playerCount),
          capitalPositionOptions: capitalOptions,
        };
      });
    },

    // 국가 선택
    selectNation: (playerIndex: number, nation: NationType) => {
      set((state) => {
        // 이미 선택된 국가인지 확인
        if (state.setupState.selectedNations.includes(nation)) {
          return; // 이미 선택됨
        }

        state.setupState.selectedNations[playerIndex] = nation;
        state.players[playerIndex].nation = nation;

        // 모든 플레이어가 선택했는지 확인
        const allSelected = state.setupState.selectedNations.every((n) => n !== null);
        if (allSelected) {
          state.setupState.phase = 'capitalSelect';
          state.setupState.currentSetupPlayer = 0;
        } else {
          // 다음 미선택 플레이어로 이동
          for (let i = 0; i < state.players.length; i++) {
            if (state.setupState.selectedNations[i] === null) {
              state.setupState.currentSetupPlayer = i;
              break;
            }
          }
        }
      });
    },

    // 수도 위치 선택
    selectCapitalPosition: (playerIndex: number, position: Position) => {
      set((state) => {
        const player = state.players[playerIndex];
        const playerId = player.id;

        // 다른 도시와 최소 3칸 이상 떨어져 있는지 확인 (체비셰프 거리, 대각선 포함)
        for (const p of state.players) {
          for (const city of p.cities) {
            const dx = Math.abs(city.position.x - position.x);
            const dy = Math.abs(city.position.y - position.y);
            if (Math.max(dx, dy) < 3) {
              return; // 너무 가까움
            }
          }
        }

        // 수도 생성
        const capitalId = uuidv4();
        const capital = createCity(
          capitalId,
          `${player.name}의 수도`,
          playerId,
          position,
          true
        );

        player.cities.push(capital);
        player.hasCapital = true;

        // 맵에 도시 표시
        state.map.tiles[position.y][position.x].cityId = capitalId;
        state.map.tiles[position.y][position.x].ownerId = playerId;

        // 주변 8칸 소유권 설정
        setAdjacentTilesOwner(state.map, position, playerId);

        // 다음 플레이어로 이동 또는 설정 완료 처리
        if (playerIndex < state.players.length - 1) {
          state.setupState.currentSetupPlayer = playerIndex + 1;
        } else {
          // 모든 플레이어가 수도 선택을 완료함
          state.setupState.phase = 'ready';

          // ✨ [새로운 기능] 모든 플레이어에게 초기 유닛 생성 (개척자 1, 군사 유닛 1)
          state.players.forEach((p) => {
            const playerCapital = p.cities.find((c) => c.isCapital);
            if (playerCapital) {
              // 1. 개척자(Settler) 생성
              const settlerId = uuidv4();
              const settler = createUnit(settlerId, 'settler', p.id, playerCapital.position);
              p.units.push(settler);
              // 맵 타일에 유닛 배치
              state.map.tiles[playerCapital.position.y][playerCapital.position.x].unitIds.push(settlerId);

              // 2. 군사 유닛(Military) 생성
              const militaryId = uuidv4();
              const military = createUnit(militaryId, 'military', p.id, playerCapital.position);
              p.units.push(military);
              // 맵 타일에 유닛 배치
              state.map.tiles[playerCapital.position.y][playerCapital.position.x].unitIds.push(militaryId);
            }
          });
        }
      });
    },

    // 게임 시작
    startGame: () => {
      set((state) => {
        // 초기 유닛 생성 로직은 selectCapitalPosition으로 이동했으므로 여기서는 제거합니다.

        state.turn = 1;
        state.currentPhase = 'start';
        state.currentPlayerIndex = 0;
        state.firstPlayerIndex = 0;
        state.phaseComplete = new Array(state.players.length).fill(false);
      });
    },

    initGame: (config: GameConfig) => {
      // 기존 initGame 로직을 initSetup + startGame으로 분리
      get().initSetup(config.playerCount, config.playerNames);
    },

    resetGame: () => {
      set(createInitialState());
    },

    nextPhase: () => {
      const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
      set((state) => {
        const currentIndex = phases.indexOf(state.currentPhase);
        if (currentIndex < phases.length - 1) {
          state.currentPhase = phases[currentIndex + 1];
          state.phaseComplete = new Array(state.players.length).fill(false);

          // 모든 단계는 순차 진행 - 선플레이어부터 시작
          state.currentPlayerIndex = state.firstPlayerIndex;

          // 교역 단계 시작 시 교역 수령 플래그 리셋
          if (state.currentPhase === 'trade') {
            state.players.forEach((player) => {
              player.hasCollectedTrade = false;
            });
          }

          // 이동 단계 시작 시 유닛 이동력 초기화
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
          // 연구 → 차례시작 (새 턴)
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
          // 다음 페이즈로 이동
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
        const nation = NATIONS[currentPlayer.nation];

        // 현재 플레이어 자원 정산
        currentPlayer.cities.forEach((city) => {
          if (city.currentProduction) {
            city.productionProgress += city.production;
            if (city.productionProgress >= city.currentProduction.cost) {
              city.productionProgress = 0;
              city.currentProduction = null;
            }
          }
        });

        // 국가 보너스: 교역, 문화 추가
        currentPlayer.resources.trade = Math.min(27, currentPlayer.resources.trade + nation.bonus.tradeBonus);
        currentPlayer.cultureTrack += nation.bonus.cultureBonus;

        // 현재 플레이어 유닛 이동력 리셋
        currentPlayer.units.forEach((unit) => {
          unit.movement = unit.maxMovement;
          unit.hasMoved = false;
        });

        // 다음 턴으로 이동 (라운드 완료)
        state.turn += 1;
        // 선플레이어 로테이션: 다음 라운드의 선플레이어는 (현재 선플레이어 + 1) % 플레이어 수
        state.firstPlayerIndex = (state.firstPlayerIndex + 1) % state.players.length;
        // 새 턴은 선플레이어부터 시작
        state.currentPlayerIndex = state.firstPlayerIndex;
        state.currentPhase = 'start';
        state.phaseComplete = new Array(state.players.length).fill(false);

        // 모든 도시의 턴당 행동 제한 초기화
        state.players.forEach((player) => {
          player.cities.forEach((city) => {
            city.hasActedThisTurn = false;
          });
        });
      });

      get().checkVictory();
    },

    // 모든 단계는 순차 진행 - 현재 플레이어가 단계를 완료할 때 호출
    endPhaseForCurrentPlayer: () => {
      const phases: GamePhase[] = ['start', 'trade', 'cityManagement', 'movement', 'research'];
      set((state) => {
        // 순차 진행: 현재 플레이어 완료 표시 후 다음 플레이어로
        state.phaseComplete[state.currentPlayerIndex] = true;

        // 선플레이어 순서로 다음 플레이어 찾기
        const playerOrder = getPlayerOrder(state.firstPlayerIndex, state.players.length);
        const currentOrderIndex = playerOrder.indexOf(state.currentPlayerIndex);
        const nextOrderIndex = currentOrderIndex + 1;

        if (nextOrderIndex < playerOrder.length) {
          // 다음 플레이어로
          state.currentPlayerIndex = playerOrder[nextOrderIndex];
        } else {
          // 모든 플레이어가 완료

          // 연구 단계가 완료되면 결과 화면 표시
          if (state.currentPhase === 'research') {
            state.showResearchResults = true;
            // 연구를 하지 않은 플레이어도 결과에 추가 (연구 안함으로 표시)
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

          // 다음 단계로 (연구 단계면 연구 결과 화면을 먼저 보여주고 나중에 다음 턴으로)
          const currentIndex = phases.indexOf(state.currentPhase);
          if (currentIndex < phases.length - 1) {
            state.currentPhase = phases[currentIndex + 1];
            state.phaseComplete = new Array(state.players.length).fill(false);

            // 모든 단계는 선플레이어부터 순차 진행
            state.currentPlayerIndex = state.firstPlayerIndex;

            // 교역 단계 시작 시 교역 수령 플래그 리셋
            if (state.currentPhase === 'trade') {
              state.players.forEach((player) => {
                player.hasCollectedTrade = false;
              });
            }

            // 이동 단계 시작 시 유닛 이동력 초기화
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

    // 현재 라운드의 플레이어 순서 반환
    getPlayerOrderForCurrentRound: () => {
      const { firstPlayerIndex, players } = get();
      return getPlayerOrder(firstPlayerIndex, players.length);
    },

    setPhaseComplete: (playerIndex: number, complete: boolean) => {
      set((state) => {
        state.phaseComplete[playerIndex] = complete;
      });
    },

    updateResources: (playerId: string, resources: Partial<Resources>) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          Object.assign(player.resources, resources);
        }
      });
    },

    addTrade: (playerId: string, amount: number) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          player.resources.trade = Math.min(27, player.resources.trade + amount);
        }
      });
    },

    // 교역 수입 수령 (교역 단계에서 턴당 1회만 가능)
    collectTradeIncome: (playerId: string) => {
      const state = get();
      // 교역 단계에서만 가능
      if (state.currentPhase !== 'trade') {
        return false;
      }

      const player = state.players.find((p) => p.id === playerId);
      if (!player) return false;

      // 이미 수령했으면 불가
      if (player.hasCollectedTrade) {
        return false;
      }

      // 교역 수입 계산 (타일 기반)
      const tradeIncome = calculateTradeIncome(player, state.map);

      set((state) => {
        const p = state.players.find((p) => p.id === playerId);
        if (p) {
          p.resources.trade = Math.min(27, p.resources.trade + tradeIncome);
          p.hasCollectedTrade = true;
        }
      });

      return true;
    },

    spendTrade: (playerId: string, amount: number) => {
      const player = get().players.find((p) => p.id === playerId);
      if (!player || player.resources.trade < amount) return false;

      set((state) => {
        const p = state.players.find((p) => p.id === playerId);
        if (p) {
          p.resources.trade -= amount;
        }
      });
      return true;
    },

    addCurrency: (playerId: string, amount: number) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          player.resources.currency += amount;
        }
      });
    },

    addCulture: (playerId: string, amount: number) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (player) {
          player.cultureTrack += amount;
        }
      });
    },

    changeGovernment: (playerId: string, government: string) => {
      // 정치체제 변경은 차례 시작 단계에서만 가능
      if (get().currentPhase !== 'start') {
        return;
      }

      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        // 기술 요구사항 검증
        const govDef = GOVERNMENTS[government as keyof typeof GOVERNMENTS];
        if (!govDef) return;
        if (govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
          return; // 필요한 기술을 연구하지 않음
        }

        player.government = government as any;
      });
    },

    foundCity: (playerId: string, position: Position, name: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        if (player.cities.length >= 3) return; // 최대 3개 도시

        // 다른 도시와 최소 3칸 이상 떨어져 있는지 확인 (체비셰프 거리, 대각선 포함)
        for (const p of state.players) {
          for (const city of p.cities) {
            const dx = Math.abs(city.position.x - position.x);
            const dy = Math.abs(city.position.y - position.y);
            if (Math.max(dx, dy) < 3) {
              return; // 너무 가까움
            }
          }
        }

        const cityId = uuidv4();
        const city = createCity(cityId, name, playerId, position, false);

        player.cities.push(city);
        state.map.tiles[position.y][position.x].cityId = cityId;
        state.map.tiles[position.y][position.x].ownerId = playerId;

        setAdjacentTilesOwner(state.map, position, playerId);
      });
    },

    buildInCity: (cityId: string, buildingType: string, position?: Position) => {
      const currentState = get();

      set((state) => {
        for (const player of state.players) {
          const city = player.cities.find((c) => c.id === cityId);
          if (city) {
            // 건물 정의 가져오기
            const buildingDef = BUILDINGS[buildingType as keyof typeof BUILDINGS];
            if (!buildingDef) return;

            // 도시가 이번 턴에 이미 행동했는지 확인
            if (city.hasActedThisTurn) {
              return; // 턴당 1회 행동 제한
            }

            // 생산량 >= 비용 검증
            const cityProduction = calculateCityProduction(city, state.map);
            if (cityProduction < buildingDef.productionCost) {
              return; // 생산량 부족
            }

            // maxPerCity 체크 (성벽 등 도시당 1개 제한 건물)
            const existingCount = city.buildings.filter((b) => b.type === buildingType).length;
            if (buildingDef.maxPerCity && existingCount >= buildingDef.maxPerCity) {
              return; // 최대 건설 개수 초과
            }

            // 이미 해당 건물이 있는지 확인 (중복 건설 방지)
            const alreadyBuilt = city.buildings.some((b) => b.type === buildingType);
            if (alreadyBuilt) {
              return; // 이미 건설된 건물은 다시 건설 불가
            }

            // 건물 지형 제한 확인
            if (buildingDef.allowedTerrain) {
              // 'city'는 도시 타일에만
              if (buildingDef.allowedTerrain.includes('city')) {
                // 성벽은 도시 타일에만 건설 (position이 없거나 도시 위치와 같아야 함)
                if (position && (position.x !== city.position.x || position.y !== city.position.y)) {
                  return; // 도시 타일이 아님
                }
              } else if (position) {
                // 다른 건물은 지정된 지형에만 건설
                const targetTile = state.map.tiles[position.y]?.[position.x];
                if (targetTile && !buildingDef.allowedTerrain.includes(targetTile.terrain)) {
                  return; // 허용되지 않은 지형
                }
              }
            }

            const buildingId = uuidv4();
            city.buildings.push({
              id: buildingId,
              type: buildingType as any,
              isConstructed: true,
              tilePosition: position, // 건물이 배치될 타일 위치
            });

            // 맵에 건물 표시 (위치가 지정된 경우)
            if (position) {
              const tile = state.map.tiles[position.y]?.[position.x];
              if (tile && !tile.buildingType) {
                tile.buildingType = buildingType as any;
              }
            }

            // 성벽인 경우 hasWalls 설정 및 도시 방어 보너스 추가
            if (buildingType === 'walls') {
              city.hasWalls = true;
              city.cityDefenseBonus += buildingDef.effects.cityDefenseBonus;
            }
            // 막사인 경우 전투 보너스 추가
            if (buildingType === 'barracks') {
              city.combatBonus += buildingDef.effects.combatBonus;
            }

            // 턴당 행동 완료 표시
            city.hasActedThisTurn = true;
            break;
          }
        }
      });
    },

    harvestCityCulture: (playerId: string, cityId: string) => {
      set((state) => {
        if (state.currentPhase !== 'cityManagement') return;

        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        const city = player.cities.find((c) => c.id === cityId);
        if (!city || city.hasActedThisTurn) return;

        const cityCulture = calculateCityCulture(city, state.map);
        if (cityCulture > 0) {
          player.cultureTrack += cityCulture;
          city.hasActedThisTurn = true;
        }
      });
    },

    setProduction: (cityId: string, itemType: string, itemId: string) => {
      set((state) => {
        for (const player of state.players) {
          const city = player.cities.find((c) => c.id === cityId);
          if (city) {
            city.currentProduction = {
              type: itemType as any,
              itemId,
              name: itemId,
              cost: 5, // TODO: 실제 비용 계산
            };
            city.productionProgress = 0;
            break;
          }
        }
      });
    },

    createUnit: (playerId: string, type: UnitType, position: Position) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        // 도시 경영 단계에서 해당 위치의 도시가 이미 행동했는지 확인
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

        // 도시 경영 단계: 해당 도시의 행동 완료 표시
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

      // 상하좌우 4방향만 이동 가능 (대각선 불가)
      const dx = Math.abs(newPosition.x - unit.position.x);
      const dy = Math.abs(newPosition.y - unit.position.y);
      if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return;

      const targetTile = state.map.tiles[newPosition.y][newPosition.x];

      // 적대적인 유닛 확인
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

      // 적대적인 도시 확인 (유닛이 없어도 적 도시 타일이면 전투 발생)
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

      // 적대적인 유닛이나 도시가 있으면 전투 시작
      if (enemyPlayerId) {
        // 단일 유닛 전투 시 selectedUnits 설정
        set((s) => {
          if (!s.selectedUnits.includes(unitId)) {
            s.selectedUnits = [unitId];
          }
        });
        get().startCombat(currentPlayer.id, newPosition);
        // 전투 시작 - 유닛 이동은 전투 결과 후 처리
        return;
      }

      // 적이 없으면 일반 이동
      set((s) => {
        for (const player of s.players) {
          const u = player.units.find((u) => u.id === unitId);
          if (u) {
            const tile = s.map.tiles[newPosition.y][newPosition.x];

            // 타일 스태킹 제한 확인
            const stackingLimit = BASE_STACKING_LIMIT + player.stackingLimitBonus;

            // 해당 타일에 있는 이 플레이어의 유닛 수 계산
            const myUnitsOnTile = tile.unitIds.filter((id) =>
              player.units.some((unit) => unit.id === id)
            ).length;

            if (myUnitsOnTile >= stackingLimit) {
              // 스태킹 제한 초과 - 이동 불가
              return;
            }

            // 이전 타일에서 제거
            const oldTile = s.map.tiles[u.position.y][u.position.x];
            oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);

            // 새 타일에 추가
            u.position = newPosition;
            u.movement -= 1;
            // 이동력이 0이 되면 이동 완료 표시
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

    // 새로운 부대 카드 생산 (공격력/체력 선택 시스템)
    produceArmyCard: (
      playerId: string,
      type: ArmyCardType,
      tier: ArmyTier,
      attack: number,
      health: number,
      name: string,
      cityId?: string
    ) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        // 도시 경영 단계에서 해당 도시가 이미 행동했는지 확인
        if (state.currentPhase === 'cityManagement' && cityId) {
          const city = player.cities.find((c) => c.id === cityId);
          if (city?.hasActedThisTurn) return;
        }

        const card = createArmyCard(uuidv4(), type, tier, playerId, attack, health, name);
        player.armyCards.push(card);

        // 도시 경영 단계: 해당 도시의 행동 완료 표시
        if (state.currentPhase === 'cityManagement' && cityId) {
          const city = player.cities.find((c) => c.id === cityId);
          if (city) city.hasActedThisTurn = true;
        }
      });
    },

    removeArmyCard: (playerId: string, cardId: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        const cardIndex = player.armyCards.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          player.armyCards.splice(cardIndex, 1);
        }
      });
    },

    researchTech: (playerId: string, techId: string) => {
      // F1: 연구 단계에서만 가능
      if (get().currentPhase !== 'research') {
        return false;
      }

      const player = get().players.find((p) => p.id === playerId);
      if (!player) return false;

      const tech = TECHNOLOGIES.find((t) => t.id === techId);
      if (!tech) return false;

      if (player.resources.trade < tech.cost) return false;

      // 피라미드 제약 확인
      const techCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      player.technologies.forEach((t) => {
        techCounts[t.level as keyof typeof techCounts]++;
      });

      if (tech.level > 1) {
        const requiredCount = tech.level - 1;
        const previousLevel = (tech.level - 1) as 1 | 2 | 3 | 4 | 5;
        if (techCounts[previousLevel] < requiredCount) return false;
      }

      set((state) => {
        const p = state.players.find((p) => p.id === playerId);
        if (p) {
          p.resources.trade -= tech.cost;
          p.technologies.push({ ...tech, isResearched: true });
        }
      });

      // 연구 결과 기록 (연구 단계 완료 후 모두에게 공개)
      get().recordResearch(playerId, techId, tech.name);

      return true;
    },

    combatState: initialCombatState,

    startCombat: (moverId: string, targetPosition: Position) => {
      const state = get();
      const mover = state.players.find((p) => p.id === moverId);
      if (!mover) return;

      const targetTile = state.map.tiles[targetPosition.y][targetPosition.x];

      // 방어자 결정
      let defenderId: string | null = null;
      for (const p of state.players) {
        if (p.id === moverId) continue;
        // 타일 위의 적 유닛 확인
        if (p.units.some((u) => targetTile.unitIds.includes(u.id))) {
          defenderId = p.id;
          break;
        }
        // 적 도시 확인
        if (targetTile.cityId && p.cities.some((c) => c.id === targetTile.cityId)) {
          defenderId = p.id;
          break;
        }
      }
      if (!defenderId) return;

      const defender = state.players.find((p) => p.id === defenderId)!;

      // 전투 타입 결정
      let combatType: CombatType = 'field';
      let targetCityId: string | null = null;
      let isWalledCity = false;

      if (targetTile.cityId) {
        const city = defender.cities.find((c) => c.id === targetTile.cityId);
        if (city) {
          combatType = city.isCapital ? 'capital' : 'city';
          targetCityId = city.id;
          isWalledCity = city.hasWalls || city.isCapital; // 수도는 기본 성벽
        }
      }

      // 역할 교환: 성벽 도시/수도 공격 시 이동자가 방어자가 됨 (6.10)
      let attackerRoleId = moverId;
      let defenderRoleId = defenderId;
      let rolesSwapped = false;

      if (isWalledCity) {
        attackerRoleId = defenderId;
        defenderRoleId = moverId;
        rolesSwapped = true;
      }

      // 카드 제한 계산 (6.9)
      // 이동자의 선택된 유닛 수 (군사 유닛만)
      const moverMilitaryUnits = state.selectedUnits.length > 0
        ? state.selectedUnits.filter((id) =>
            mover.units.find((u) => u.id === id && u.type === 'military')
          ).length
        : mover.units.filter((u) =>
            u.type === 'military' && state.selectedUnit === u.id
          ).length || 1;

      // 방어자의 군사 유닛 수 (타일 위)
      const defenderMilitaryUnits = defender.units.filter((u) =>
        targetTile.unitIds.includes(u.id) && u.type === 'military'
      ).length;

      let moverMaxCards: number;
      let defenderSideMaxCards: number;

      if (combatType === 'field') {
        // 야전: 양측 모두 유닛 수 기반
        moverMaxCards = getAttackerMaxCards(moverMilitaryUnits);
        defenderSideMaxCards = getAttackerMaxCards(Math.max(defenderMilitaryUnits, 1));
      } else {
        // 도시/수도 전투: 도시 측 최대 6장, 이동자 측 유닛 수 기반
        moverMaxCards = getAttackerMaxCards(moverMilitaryUnits);
        defenderSideMaxCards = CITY_CAPITAL_MAX_CARDS;
      }

      // 역할 교환 시 카드 제한도 교환
      const attackerMaxCards = rolesSwapped ? defenderSideMaxCards : moverMaxCards;
      const defenderMaxCards = rolesSwapped ? moverMaxCards : defenderSideMaxCards;

      // 보너스 계산 (6.1)
      const attackerPlayer = state.players.find((p) => p.id === attackerRoleId)!;
      const defenderPlayer = state.players.find((p) => p.id === defenderRoleId)!;

      let attackerCombatBonus = 0;
      for (const city of attackerPlayer.cities) {
        attackerCombatBonus += city.combatBonus;
      }

      let defenderCombatBonus = 0;
      for (const city of defenderPlayer.cities) {
        defenderCombatBonus += city.combatBonus;
      }

      // 도시 방어 보너스: 도시 주인이 방어자일 때만 적용 (역할 교환 시 적용 안됨)
      let defenderCityDefenseBonus = 0;
      if (combatType !== 'field' && !rolesSwapped && targetCityId) {
        const city = defender.cities.find((c) => c.id === targetCityId);
        if (city) {
          defenderCityDefenseBonus = city.cityDefenseBonus + (city.isCapital ? 6 : 0);
        }
      }

      set((s) => {
        s.combatState = {
          isActive: true,
          originalMoverId: moverId,
          originalDefenderId: defenderId,
          attackerRoleId,
          defenderRoleId,
          combatType,
          targetTilePosition: { ...targetPosition },
          targetCityId,
          isWalledCity,
          rolesSwapped,
          attackerAvailableCards: JSON.parse(JSON.stringify(attackerPlayer.armyCards)),
          defenderAvailableCards: JSON.parse(JSON.stringify(defenderPlayer.armyCards)),
          battlefields: [],
          placement: {
            currentTurn: 'defender',
            attackerPassed: false,
            defenderPassed: false,
            attackerDeployCount: 0,
            defenderDeployCount: 0,
            attackerMaxCards,
            defenderMaxCards,
          },
          graveyard: [],
          phase: 'placement',
          attackerCombatBonus,
          defenderCombatBonus,
          defenderCityDefenseBonus,
          attackerFinalScore: 0,
          defenderFinalScore: 0,
          winner: null,
          winnerPlayerId: null,
          loserPlayerId: null,
          lootSelections: [],
          maxLootSelections: 0,
          log: [],
        };
      });
    },

    placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive || cs.phase !== 'placement') return;

        const isAttacker = cs.attackerRoleId === playerId;
        const availableCards = isAttacker ? cs.attackerAvailableCards : cs.defenderAvailableCards;
        const placement = cs.placement;

        // 턴 확인
        const expectedTurn = isAttacker ? 'attacker' : 'defender';
        if (placement.currentTurn !== expectedTurn) return;

        // 카드 제한 확인
        const deployCount = isAttacker ? placement.attackerDeployCount : placement.defenderDeployCount;
        const maxCards = isAttacker ? placement.attackerMaxCards : placement.defenderMaxCards;
        if (deployCount >= maxCards) return;

        // 카드 찾기
        const cardIndex = availableCards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return;
        const card = availableCards.splice(cardIndex, 1)[0];

        if (battlefieldId === null) {
          // 새 전장 슬롯 생성 (6.12)
          cs.battlefields.push({
            id: uuidv4(),
            attackerCard: isAttacker ? card : null,
            defenderCard: isAttacker ? null : card,
            resolved: false,
            result: null,
          });
        } else {
          // 기존 전장에 상대 카드 맞대기 (6.12)
          const bf = cs.battlefields.find((b) => b.id === battlefieldId);
          if (!bf) return;
          if (isAttacker) {
            if (bf.attackerCard) return;
            bf.attackerCard = card;
          } else {
            if (bf.defenderCard) return;
            bf.defenderCard = card;
          }
        }

        // 배치 수 업데이트
        if (isAttacker) placement.attackerDeployCount++;
        else placement.defenderDeployCount++;

        // 턴 교대
        placement.currentTurn = isAttacker ? 'defender' : 'attacker';

        // 배치한 측의 패스 리셋
        if (isAttacker) placement.attackerPassed = false;
        else placement.defenderPassed = false;

        // 다음 턴 플레이어가 이미 패스했거나 제한 도달 시 자동 진행
        const nextIsAttacker = placement.currentTurn === 'attacker';
        const nextPassed = nextIsAttacker ? placement.attackerPassed : placement.defenderPassed;
        const nextAtLimit = nextIsAttacker
          ? placement.attackerDeployCount >= placement.attackerMaxCards
          : placement.defenderDeployCount >= placement.defenderMaxCards;

        if (nextPassed || nextAtLimit) {
          // 현재 측도 제한이면 해결 단계로
          const currentAtLimit = isAttacker
            ? placement.attackerDeployCount >= placement.attackerMaxCards
            : placement.defenderDeployCount >= placement.defenderMaxCards;
          const currentPassed = isAttacker ? placement.attackerPassed : placement.defenderPassed;

          if (currentAtLimit || currentPassed) {
            cs.phase = 'resolution';
          } else {
            // 현재 측에게 턴 돌려줌
            placement.currentTurn = isAttacker ? 'attacker' : 'defender';
          }
        }
      });
    },

    passTurn: (playerId: string) => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive || cs.phase !== 'placement') return;

        const isAttacker = cs.attackerRoleId === playerId;

        if (isAttacker) cs.placement.attackerPassed = true;
        else cs.placement.defenderPassed = true;

        // 양측 모두 패스하면 해결 단계로 (6.11)
        if (cs.placement.attackerPassed && cs.placement.defenderPassed) {
          cs.phase = 'resolution';
        } else {
          cs.placement.currentTurn = isAttacker ? 'defender' : 'attacker';

          // 상대도 패스했거나 제한 도달 시 해결 단계로
          const otherPassed = isAttacker ? cs.placement.defenderPassed : cs.placement.attackerPassed;
          const otherAtLimit = isAttacker
            ? cs.placement.defenderDeployCount >= cs.placement.defenderMaxCards
            : cs.placement.attackerDeployCount >= cs.placement.attackerMaxCards;

          if (otherPassed || otherAtLimit) {
            cs.phase = 'resolution';
          }
        }
      });
    },

    resolveBattlefieldsAction: () => {
      const cs = get().combatState;
      if (!cs.isActive || cs.phase !== 'resolution') return;

      const result = resolveBattlefields({
        battlefields: JSON.parse(JSON.stringify(cs.battlefields)),
        attackerCombatBonus: cs.attackerCombatBonus,
        defenderCombatBonus: cs.defenderCombatBonus,
        defenderCityDefenseBonus: cs.defenderCityDefenseBonus,
        originalMoverId: cs.originalMoverId!,
        attackerRoleId: cs.attackerRoleId!,
      });

      set((state) => {
        const cs = state.combatState;
        cs.battlefields = result.resolvedBattlefields;
        cs.graveyard = result.graveyard;
        cs.attackerFinalScore = result.attackerFinalScore;
        cs.defenderFinalScore = result.defenderFinalScore;
        cs.winner = result.winner;

        // 실제 플레이어 ID 결정
        if (result.winner === 'attacker') {
          cs.winnerPlayerId = cs.attackerRoleId;
          cs.loserPlayerId = cs.defenderRoleId;
        } else {
          cs.winnerPlayerId = cs.defenderRoleId;
          cs.loserPlayerId = cs.attackerRoleId;
        }

        cs.log = [...cs.log, ...result.log];
        cs.phase = 'scoring';
      });
    },

    proceedToLoot: () => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive) return;

        // 수도 전투에서 이동자 승리 = 군사 승리 (전리품 없이 바로 결과)
        if (cs.combatType === 'capital' && cs.winnerPlayerId === cs.originalMoverId) {
          cs.maxLootSelections = 0;
          cs.phase = 'result';
          return;
        }

        // 도시 전투에서 이동자(공격자) 승리 = 전리품 2개 (6.6)
        if (cs.combatType === 'city' && cs.winnerPlayerId === cs.originalMoverId) {
          cs.maxLootSelections = 2;
        } else {
          // 야전 또는 방어자 승리 = 전리품 1개
          cs.maxLootSelections = 1;
        }
        cs.phase = 'loot';
      });
    },

    selectLoot: (choice: 'trade' | 'culture') => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive || cs.phase !== 'loot') return;

        const loser = state.players.find((p) => p.id === cs.loserPlayerId);
        if (!loser) return;

        const available = choice === 'trade' ? loser.resources.trade : loser.resources.culture;
        const amount = Math.min(LOOT_MAX_PER_SELECTION, available);

        cs.lootSelections.push({ type: choice, amount });

        // 즉시 자원 차감 (다음 선택 시 남은 양 반영)
        if (choice === 'trade') {
          loser.resources.trade -= amount;
        } else {
          loser.resources.culture -= amount;
        }

        if (cs.lootSelections.length >= cs.maxLootSelections) {
          cs.phase = 'result';
        }
      });
    },

    endCombat: () => {
      const cs = get().combatState;
      if (!cs.isActive) return;

      set((state) => {
        const winnerId = state.combatState.winnerPlayerId;
        const loserId = state.combatState.loserPlayerId;
        const moverId = state.combatState.originalMoverId;
        const targetPos = state.combatState.targetTilePosition;

        const winner = winnerId ? state.players.find((p) => p.id === winnerId) : null;
        const loser = loserId ? state.players.find((p) => p.id === loserId) : null;
        const mover = moverId ? state.players.find((p) => p.id === moverId) : null;

        if (!targetPos) {
          state.combatState = { ...initialCombatState };
          return;
        }

        // 1. 전리품 지급 (승자에게 추가)
        if (winner && state.combatState.lootSelections.length > 0) {
          for (const loot of state.combatState.lootSelections) {
            if (loot.type === 'trade') {
              winner.resources.trade += loot.amount;
            } else {
              winner.resources.culture += loot.amount;
            }
          }
          // 패자에서 차감은 selectLoot에서 이미 처리됨
        }

        // 2. 사망한 카드 제거 (6.16)
        const graveyardIds = new Set(state.combatState.graveyard.map((c) => c.id));
        if (winner) {
          winner.armyCards = winner.armyCards.filter((c) => !graveyardIds.has(c.id));
        }
        if (loser) {
          loser.armyCards = loser.armyCards.filter((c) => !graveyardIds.has(c.id));
        }

        const targetTile = state.map.tiles[targetPos.y][targetPos.x];

        // 3. 전투 후 유닛 처리
        if (mover && winnerId === moverId) {
          // 이동자 승리 (6.4)
          // 적 유닛 파괴
          const originalDefenderId = state.combatState.originalDefenderId;
          const defenderPlayer = state.players.find((p) => p.id === originalDefenderId);
          if (defenderPlayer) {
            const enemyUnitIds = targetTile.unitIds.filter((id) =>
              defenderPlayer.units.some((u) => u.id === id)
            );
            defenderPlayer.units = defenderPlayer.units.filter(
              (u) => !enemyUnitIds.includes(u.id)
            );
            targetTile.unitIds = targetTile.unitIds.filter(
              (id) => !enemyUnitIds.includes(id)
            );
          }

          // 이동자 유닛을 타겟 타일로 이동
          const movingUnitIds = state.selectedUnits.length > 0
            ? state.selectedUnits
            : state.selectedUnit ? [state.selectedUnit] : [];

          for (const unitId of movingUnitIds) {
            const unit = mover.units.find((u) => u.id === unitId);
            if (unit) {
              const oldTile = state.map.tiles[unit.position.y][unit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);
              unit.position = { x: targetPos.x, y: targetPos.y };
              unit.movement = 0;
              unit.hasMoved = true;
              if (!targetTile.unitIds.includes(unitId)) {
                targetTile.unitIds.push(unitId);
              }
            }
          }

          // 도시 점령 (6.6)
          if (state.combatState.combatType === 'city' && state.combatState.targetCityId && defenderPlayer) {
            const cityIndex = defenderPlayer.cities.findIndex(
              (c) => c.id === state.combatState.targetCityId
            );
            if (cityIndex !== -1) {
              const city = defenderPlayer.cities[cityIndex];
              city.ownerId = moverId!;
              defenderPlayer.cities.splice(cityIndex, 1);
              mover.cities.push(city);
              targetTile.ownerId = moverId!;
            }
          }

          // 수도 점령 = 군사 승리 (6.7)
          if (state.combatState.combatType === 'capital') {
            state.winner = moverId;
            state.winCondition = 'military';
            state.isGameOver = true;
          }
        } else if (mover && winnerId !== moverId) {
          // 이동자 패배 (6.5) - 이동자 유닛 파괴
          const movingUnitIds = state.selectedUnits.length > 0
            ? state.selectedUnits
            : state.selectedUnit ? [state.selectedUnit] : [];

          for (const unitId of movingUnitIds) {
            const unit = mover.units.find((u) => u.id === unitId);
            if (unit) {
              const oldTile = state.map.tiles[unit.position.y][unit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unitId);
            }
          }
          mover.units = mover.units.filter((u) => !movingUnitIds.includes(u.id));
        }

        // 전투 상태 초기화
        state.combatState = { ...initialCombatState };
        state.selectedUnits = [];
      });
    },

    getTile: (position: Position) => {
      const { map } = get();
      if (
        position.x < 0 ||
        position.x >= map.width ||
        position.y < 0 ||
        position.y >= map.height
      ) {
        return null;
      }
      return map.tiles[position.y][position.x];
    },

    setTileOwner: (position: Position, ownerId: string | null) => {
      set((state) => {
        state.map.tiles[position.y][position.x].ownerId = ownerId;
      });
    },

    checkVictory: () => {
      const state = get();

      for (const player of state.players) {
        if (player.isEliminated) continue;

        // 과학 승리: 5단계 기술 연구
        if (player.technologies.some((t) => t.id === 'space_flight')) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'science';
            s.isGameOver = true;
          });
          return;
        }

        // 경제 승리: 화폐 15개
        if (player.resources.currency >= 15) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'economic';
            s.isGameOver = true;
          });
          return;
        }

        // 문화 승리: 문화 트랙 20
        if (player.cultureTrack >= 20) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'culture';
            s.isGameOver = true;
          });
          return;
        }
      }

      // 군사 승리: 다른 모든 플레이어 제거
      const activePlayers = state.players.filter((p) => !p.isEliminated);
      if (activePlayers.length === 1) {
        set((s) => {
          s.winner = activePlayers[0].id;
          s.winCondition = 'military';
          s.isGameOver = true;
        });
      }
    },

    selectedTile: null,
    selectedUnit: null,

    setSelectedTile: (position: Position | null) => {
      set((state) => {
        state.selectedTile = position;
      });
    },

    setSelectedUnit: (unitId: string | null) => {
      set((state) => {
        state.selectedUnit = unitId;
        // 단일 선택 시 다중 선택 초기화
        state.selectedUnits = unitId ? [unitId] : [];
      });
    },

    setSelectedUnits: (unitIds: string[]) => {
      set((state) => {
        state.selectedUnits = unitIds;
        state.selectedUnit = unitIds.length > 0 ? unitIds[0] : null;
      });
    },

    toggleUnitSelection: (unitId: string) => {
      set((state) => {
        const idx = state.selectedUnits.indexOf(unitId);
        if (idx >= 0) {
          state.selectedUnits.splice(idx, 1);
        } else {
          state.selectedUnits.push(unitId);
        }
        state.selectedUnit = state.selectedUnits.length > 0 ? state.selectedUnits[0] : null;
      });
    },

    // 선택된 유닛들 동시 이동
    moveSelectedUnits: (newPosition: Position) => {
      const currentState = get();
      const player = currentState.players[currentState.currentPlayerIndex];

      // 그룹의 첫 유닛 위치 기준으로 4방향 검증
      const firstSelectedUnit = currentState.selectedUnits
        .map((id) => player.units.find((u) => u.id === id))
        .find((u) => u !== undefined);
      if (firstSelectedUnit) {
        const dx = Math.abs(newPosition.x - firstSelectedUnit.position.x);
        const dy = Math.abs(newPosition.y - firstSelectedUnit.position.y);
        if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return;
      }

      const targetTile = currentState.map.tiles[newPosition.y][newPosition.x];

      // 적대적인 유닛 확인
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

      // 적대적인 도시 확인 (유닛이 없어도 적 도시 타일이면 전투 발생)
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

      // 적대적인 유닛이나 도시가 있으면 전투 시작
      if (enemyPlayerId) {
        get().startCombat(player.id, newPosition);
        return;
      }

      // 적이 없으면 그룹 이동
      set((state) => {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const tile = state.map.tiles[newPosition.y][newPosition.x];

        // 이동하려는 유닛들 찾기
        const unitsToMove = state.selectedUnits
          .map((id) => currentPlayer.units.find((u) => u.id === id))
          .filter((u): u is NonNullable<typeof u> => u !== undefined && u.movement > 0);

        if (unitsToMove.length === 0) return;

        // 같은 타일에 있는 유닛만 함께 이동 가능
        const firstUnit = unitsToMove[0];
        const allOnSameTile = unitsToMove.every(
          (u) => u.position.x === firstUnit.position.x && u.position.y === firstUnit.position.y
        );
        if (!allOnSameTile) return;

        // 스태킹 제한 확인
        const stackingLimit = BASE_STACKING_LIMIT + currentPlayer.stackingLimitBonus;
        const myUnitsOnTarget = tile.unitIds.filter((id) =>
          currentPlayer.units.some((u) => u.id === id)
        ).length;

        // 이동 후 스태킹 제한을 초과하지 않는지 확인
        const maxMovable = stackingLimit - myUnitsOnTarget;
        const actualMovingUnits = unitsToMove.slice(0, Math.max(0, maxMovable));

        if (actualMovingUnits.length === 0) return;

        // 유닛들 이동
        for (const unit of actualMovingUnits) {
          // 이전 타일에서 제거
          const oldTile = state.map.tiles[unit.position.y][unit.position.x];
          oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unit.id);

          // 새 타일에 추가
          unit.position = newPosition;
          unit.movement -= 1;
          // 이동력이 0이 되면 이동 완료 표시
          if (unit.movement <= 0) {
            unit.hasMoved = true;
          }
          tile.unitIds.push(unit.id);
        }
      });
    },

    // F1: 단계별 행동 제한 확인
    canPerformAction: (action: 'research' | 'build' | 'move' | 'trade' | 'combat') => {
      const { currentPhase } = get();

      switch (action) {
        case 'research':
          return currentPhase === 'research';
        case 'build':
          return currentPhase === 'cityManagement';
        case 'move':
          return currentPhase === 'movement';
        case 'trade':
          return currentPhase === 'trade';
        case 'combat':
          return currentPhase === 'movement'; // 전투는 이동 단계에서만
        default:
          return false;
      }
    },

    // 연구 결과 기록
    turnResearchResults: [],
    showResearchResults: false,

    recordResearch: (playerId: string, techId: string, techName: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        // 기존 결과가 있으면 업데이트, 없으면 추가
        const existingIndex = state.turnResearchResults.findIndex((r) => r.playerId === playerId);
        if (existingIndex >= 0) {
          state.turnResearchResults[existingIndex] = {
            playerId,
            playerName: player?.name || '',
            techId,
            techName,
          };
        } else {
          state.turnResearchResults.push({
            playerId,
            playerName: player?.name || '',
            techId,
            techName,
          });
        }
      });
    },

    clearResearchResults: () => {
      set((state) => {
        state.turnResearchResults = [];
        state.showResearchResults = false;
      });
    },

    setShowResearchResults: (show: boolean) => {
      set((state) => {
        state.showResearchResults = show;
      });
    },
  }))
);

// 헬퍼 함수들

// 선플레이어부터 시작하는 플레이어 순서 반환
function getPlayerOrder(firstPlayerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    order.push((firstPlayerIndex + i) % playerCount);
  }
  return order;
}

// QA ver1: 16x16 표준 맵
function generateMap(width: number, height: number): GameMap {
  const resources = ['wheat', 'iron', 'gold', 'silk', 'incense', 'spice', 'none'] as const;

  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      // 가장자리에 물 배치
      let terrain: TerrainType;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        terrain = Math.random() < 0.7 ? 'water' : 'grassland';
      } else {
        // 내부는 다양한 지형
        const rand = Math.random();
        if (rand < 0.35) terrain = 'grassland';
        else if (rand < 0.55) terrain = 'forest';
        else if (rand < 0.70) terrain = 'mountain';
        else if (rand < 0.85) terrain = 'desert';
        else terrain = 'water';
      }

      const hasResource = terrain !== 'water' && Math.random() < 0.25;
      const resource = hasResource
        ? resources[Math.floor(Math.random() * (resources.length - 1))]
        : 'none';

      row.push({
        id: `${x}-${y}`,
        position: { x, y },
        terrain,
        resource,
        cityId: null,
        buildingType: null,
        unitIds: [],
        ownerId: null,
        isExplored: true,
        isVisible: true,
      });
    }
    tiles.push(row);
  }

  return { width, height, tiles };
}

function setAdjacentTilesOwner(map: GameMap, center: Position, ownerId: string) {
  // 주변 8칸 (교외 지역)
  const directions = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 },                   { x: 1, y: 0 },
    { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
  ];

  for (const dir of directions) {
    const x = center.x + dir.x;
    const y = center.y + dir.y;
    if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
      if (!map.tiles[y][x].ownerId) {
        map.tiles[y][x].ownerId = ownerId;
      }
    }
  }
}
