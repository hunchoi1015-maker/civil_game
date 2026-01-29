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
  createInitialResources,
  createCity,
  createUnit,
  createArmyCard,
  getStartPositionOptions,
  BASE_STACKING_LIMIT,
} from '../types';
import { TECHNOLOGIES } from '../constants/technologies';
import { NATIONS } from '../types/nation';
import { BUILDINGS } from '../constants/buildings';
import { calculateTradeIncome, calculateProductionCapacity } from '../engine/GameEngine';
import { calculateCityProduction, canAffordBuilding } from '../engine/ResourceCalculator';

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
    name: string
  ) => void;
  removeArmyCard: (playerId: string, cardId: string) => void;

  // 기술 연구
  researchTech: (playerId: string, techId: string) => boolean;

  // 전투
  combatState: CombatState;
  startCombat: (attackerId: string, defenderId: string) => void;
  endCombat: () => void;
  deployArmyCard: (playerId: string, cardId: string) => void;
  undeployArmyCard: (playerId: string, cardId: string) => void;

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
  attackerId: null,
  defenderId: null,
  attackerCards: [],
  defenderCards: [],
  attackerDeployed: [],
  defenderDeployed: [],
  round: 0,
  maxRounds: 5,
  log: [],
  phase: 'setup',
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

        // 다음 플레이어로 이동
        if (playerIndex < state.players.length - 1) {
          state.setupState.currentSetupPlayer = playerIndex + 1;
        } else {
          state.setupState.phase = 'ready';
        }
      });
    },

    // 게임 시작
    startGame: () => {
      set((state) => {
        // 각 플레이어에게 초기 유닛 생성 (개척자 1, 군사 유닛 1)
        state.players.forEach((player) => {
          const capital = player.cities.find((c) => c.isCapital);
          if (capital) {
            // 개척자 생성
            const settlerId = uuidv4();
            const settler = createUnit(settlerId, 'settler', player.id, capital.position);
            player.units.push(settler);
            state.map.tiles[capital.position.y][capital.position.x].unitIds.push(settlerId);

            // 군사 유닛 생성
            const militaryId = uuidv4();
            const military = createUnit(militaryId, 'military', player.id, capital.position);
            player.units.push(military);
            state.map.tiles[capital.position.y][capital.position.x].unitIds.push(militaryId);
          }
        });

        state.turn = 1;
        state.currentPhase = 'start';
        state.currentPlayerIndex = 0;
        state.firstPlayerIndex = 0;  // 첫 라운드 선플레이어는 0번
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
        if (player) {
          player.government = government as any;
        }
      });
    },

    foundCity: (playerId: string, position: Position, name: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        if (player.cities.length >= 3) return; // 최대 3개 도시

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
              if (tile && !tile.buildingId) {
                tile.buildingId = buildingId;
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

        const militaryCount = player.units.filter((u) => u.type === 'military').length;
        const settlerCount = player.units.filter((u) => u.type === 'settler').length;

        if (type === 'military' && militaryCount >= 6) return;
        if (type === 'settler' && settlerCount >= 2) return;

        const unit = createUnit(uuidv4(), type, playerId, position);
        player.units.push(unit);
        state.map.tiles[position.y][position.x].unitIds.push(unit.id);
      });
    },

    moveUnit: (unitId: string, newPosition: Position) => {
      const state = get();
      const currentPlayer = state.players[state.currentPlayerIndex];
      const unit = currentPlayer.units.find((u) => u.id === unitId);

      if (!unit) return;

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

      // 적대적인 유닛이 있으면 전투 시작
      if (enemyPlayerId) {
        get().startCombat(currentPlayer.id, enemyPlayerId);
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
            u.hasMoved = true;
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
      name: string
    ) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        const card = createArmyCard(uuidv4(), type, tier, playerId, attack, health, name);
        player.armyCards.push(card);
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

    startCombat: (attackerId: string, defenderId: string) => {
      const attacker = get().players.find((p) => p.id === attackerId);
      const defender = get().players.find((p) => p.id === defenderId);

      set((state) => {
        state.combatState = {
          isActive: true,
          attackerId,
          defenderId,
          attackerCards: attacker?.armyCards || [],
          defenderCards: defender?.armyCards || [],
          attackerDeployed: [],
          defenderDeployed: [],
          round: 1,
          maxRounds: 5,
          log: [],
          phase: 'setup',
        };
      });
    },

    endCombat: () => {
      set((state) => {
        state.combatState = initialCombatState;
      });
    },

    deployArmyCard: (playerId: string, cardId: string) => {
      set((state) => {
        const isAttacker = state.combatState.attackerId === playerId;
        const cards = isAttacker
          ? state.combatState.attackerCards
          : state.combatState.defenderCards;
        const deployed = isAttacker
          ? state.combatState.attackerDeployed
          : state.combatState.defenderDeployed;

        // 최대 20장 제한
        if (deployed.length >= 20) return;

        const cardIndex = cards.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          const card = { ...cards[cardIndex], isDeployed: true };
          cards.splice(cardIndex, 1);
          deployed.push(card);
        }
      });
    },

    undeployArmyCard: (playerId: string, cardId: string) => {
      set((state) => {
        const isAttacker = state.combatState.attackerId === playerId;
        const cards = isAttacker
          ? state.combatState.attackerCards
          : state.combatState.defenderCards;
        const deployed = isAttacker
          ? state.combatState.attackerDeployed
          : state.combatState.defenderDeployed;

        const cardIndex = deployed.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          const card = { ...deployed[cardIndex], isDeployed: false };
          deployed.splice(cardIndex, 1);
          cards.push(card);
        }
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

      // 적대적인 유닛이 있으면 전투 시작
      if (enemyPlayerId) {
        get().startCombat(player.id, enemyPlayerId);
        return;
      }

      // 적이 없으면 그룹 이동
      set((state) => {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const tile = state.map.tiles[newPosition.y][newPosition.x];

        // 이동하려는 유닛들 찾기
        const unitsToMove = state.selectedUnits
          .map((id) => currentPlayer.units.find((u) => u.id === id))
          .filter((u): u is NonNullable<typeof u> => u !== undefined && u.movement > 0 && !u.hasMoved);

        if (unitsToMove.length === 0) return;

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
          unit.hasMoved = true;
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
        buildingId: null,
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
