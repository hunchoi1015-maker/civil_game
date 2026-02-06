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
  ArmyCard,
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
import { resolveBattlefields, resolvePairedFight } from '../engine/CombatResolver';
import { TECHNOLOGIES } from '../constants/technologies';
import { NATIONS } from '../types/nation';
import { BUILDINGS } from '../constants/buildings';
import { GOVERNMENTS } from '../constants/governments';
import { calculateTradeIncome } from '../engine/GameEngine';
import { calculateCityProduction, calculateCityCulture } from '../engine/ResourceCalculator';

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

interface GameSetupState {
  phase: 'nationSelect' | 'capitalSelect' | 'ready';
  currentSetupPlayer: number;
  selectedNations: (NationType | null)[];
  capitalPositionOptions: Position[][];
}

interface TurnResearchResult {
  playerId: string;
  playerName: string;
  techId: string | null;
  techName: string | null;
}

interface GameStore extends GameState {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  startGame: () => void;
  initGame: (config: GameConfig) => void;
  resetGame: () => void;
  nextPhase: () => void;
  endTurn: () => void;
  endPhaseForCurrentPlayer: () => void;
  setPhaseComplete: (playerIndex: number, complete: boolean) => void;
  getPlayerOrderForCurrentRound: () => number[];
  debugSkipPhase: () => void;
  updateResources: (playerId: string, resources: Partial<Resources>) => void;
  addTrade: (playerId: string, amount: number) => void;
  collectTradeIncome: (playerId: string) => boolean;
  spendTrade: (playerId: string, amount: number) => boolean;
  addCurrency: (playerId: string, amount: number) => void;
  addCulture: (playerId: string, amount: number) => void;
  changeGovernment: (playerId: string, government: string) => void;
  foundCity: (playerId: string, position: Position, name: string) => void;
  buildInCity: (cityId: string, buildingType: string, position?: Position) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  setProduction: (cityId: string, itemType: string, itemId: string) => void;
  createUnit: (playerId: string, type: UnitType, position: Position) => void;
  moveUnit: (unitId: string, newPosition: Position) => void;
  removeUnit: (unitId: string) => void;
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
  researchTech: (playerId: string, techId: string) => boolean;
  combatState: CombatState;
  startCombat: (moverId: string, targetPosition: Position) => void;
  placeCardOnBattlefield: (playerId: string, cardId: string, battlefieldId: string | null) => void;
  passTurn: (playerId: string) => void;
  resolveBattlefieldsAction: () => void;
  proceedToLoot: () => void;
  selectLoot: (choice: 'trade' | 'culture'|'mercy') => void;
  endCombat: () => void;
  getTile: (position: Position) => Tile | null;
  setTileOwner: (position: Position, ownerId: string | null) => void;
  checkVictory: () => void;
  selectedTile: Position | null;
  selectedUnit: string | null;
  selectedUnits: string[];
  setSelectedTile: (position: Position | null) => void;
  setSelectedUnit: (unitId: string | null) => void;
  setSelectedUnits: (unitIds: string[]) => void;
  toggleUnitSelection: (unitId: string) => void;
  moveSelectedUnits: (newPosition: Position) => void;
  canPerformAction: (action: 'research' | 'build' | 'move' | 'trade' | 'combat') => boolean;
  turnResearchResults: TurnResearchResult[];
  showResearchResults: boolean;
  recordResearch: (playerId: string, techId: string, techName: string) => void;
  clearResearchResults: () => void;
  setShowResearchResults: (show: boolean) => void;
  startDevCombat: (
    attackerCards: ArmyCard[], 
    defenderCards: ArmyCard[], 
    attackerBonus: number, 
    defenderBonus: number, 
    attackerCityDefense: number, 
    defenderCityDefense: number, 
    combatType: CombatType
  ) => void;
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
  attackerCityDefenseBonus: 0,
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
  firstPlayerIndex: 0,
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

    initSetup: (playerCount: number, playerNames: string[]) => {
      const map = generateMap(16, 16);
      const availableNations: NationType[] = ['america', 'rome', 'egypt', 'china', 'russia', 'germany'];
      const players: Player[] = [];
      for (let i = 0; i < playerCount; i++) {
        players.push({
          id: uuidv4(),
          name: playerNames[i],
          color: PLAYER_COLORS[i],
          nation: availableNations[i],
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
      const capitalOptions: Position[][] = [];
      for (let i = 0; i < playerCount; i++) {
        capitalOptions.push(getStartPositionOptions(i, 16, 16));
      }
      set((state) => {
        state.id = uuidv4();
        state.players = players;
        state.map = map;
        state.setupState = {
          phase: 'capitalSelect',
          currentSetupPlayer: 0,
          selectedNations: availableNations.slice(0, playerCount),
          capitalPositionOptions: capitalOptions,
        };
      });
    },

    selectNation: (playerIndex: number, nation: NationType) => {
      set((state) => {
        if (state.setupState.selectedNations.includes(nation)) {
          return;
        }
        state.setupState.selectedNations[playerIndex] = nation;
        state.players[playerIndex].nation = nation;
        const allSelected = state.setupState.selectedNations.every((n) => n !== null);
        if (allSelected) {
          state.setupState.phase = 'capitalSelect';
          state.setupState.currentSetupPlayer = 0;
        } else {
          for (let i = 0; i < state.players.length; i++) {
            if (state.setupState.selectedNations[i] === null) {
              state.setupState.currentSetupPlayer = i;
              break;
            }
          }
        }
      });
    },

    selectCapitalPosition: (playerIndex: number, position: Position) => {
      set((state) => {
        const player = state.players[playerIndex];
        const playerId = player.id;
        for (const p of state.players) {
          for (const city of p.cities) {
            const dx = Math.abs(city.position.x - position.x);
            const dy = Math.abs(city.position.y - position.y);
            if (Math.max(dx, dy) < 3) {
              return;
            }
          }
        }
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
        state.map.tiles[position.y][position.x].cityId = capitalId;
        state.map.tiles[position.y][position.x].ownerId = playerId;
        setAdjacentTilesOwner(state.map, position, playerId);
        if (playerIndex < state.players.length - 1) {
          state.setupState.currentSetupPlayer = playerIndex + 1;
        } else {
          state.setupState.phase = 'ready';
          state.players.forEach((p) => {
            const playerCapital = p.cities.find((c) => c.isCapital);
            if (playerCapital) {
              const settlerId = uuidv4();
              const settler = createUnit(settlerId, 'settler', p.id, playerCapital.position);
              p.units.push(settler);
              state.map.tiles[playerCapital.position.y][playerCapital.position.x].unitIds.push(settlerId);
              const militaryId = uuidv4();
              const military = createUnit(militaryId, 'military', p.id, playerCapital.position);
              p.units.push(military);
              state.map.tiles[playerCapital.position.y][playerCapital.position.x].unitIds.push(militaryId);
            }
          });
        }
      });
    },

    startGame: () => {
      set((state) => {
        state.turn = 1;
        state.currentPhase = 'start';
        state.currentPlayerIndex = 0;
        state.firstPlayerIndex = 0;
        state.phaseComplete = new Array(state.players.length).fill(false);
      });
    },

    initGame: (config: GameConfig) => {
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
        const nation = NATIONS[currentPlayer.nation];
        currentPlayer.cities.forEach((city) => {
          if (city.currentProduction) {
            city.productionProgress += city.production;
            if (city.productionProgress >= city.currentProduction.cost) {
              city.productionProgress = 0;
              city.currentProduction = null;
            }
          }
        });
        currentPlayer.resources.trade = Math.min(27, currentPlayer.resources.trade + nation.bonus.tradeBonus);
        currentPlayer.cultureTrack += nation.bonus.cultureBonus;
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
          player.cities.forEach((city) => {
            city.hasActedThisTurn = false;
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

    collectTradeIncome: (playerId: string) => {
      const state = get();
      if (state.currentPhase !== 'trade') {
        return false;
      }
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return false;
      if (player.hasCollectedTrade) {
        return false;
      }
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
      if (get().currentPhase !== 'start') {
        return;
      }
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;
        const govDef = GOVERNMENTS[government as keyof typeof GOVERNMENTS];
        if (!govDef) return;
        if (govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
          return;
        }
        player.government = government as any;
      });
    },

    foundCity: (playerId: string, position: Position, name: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;
        if (player.cities.length >= 3) return;
        for (const p of state.players) {
          for (const city of p.cities) {
            const dx = Math.abs(city.position.x - position.x);
            const dy = Math.abs(city.position.y - position.y);
            if (Math.max(dx, dy) < 3) {
              return;
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
            const buildingDef = BUILDINGS[buildingType as keyof typeof BUILDINGS];
            if (!buildingDef) return;
            if (city.hasActedThisTurn) {
              return;
            }
            const cityProduction = calculateCityProduction(city, state.map);
            if (cityProduction < buildingDef.productionCost) {
              return;
            }
            const existingCount = city.buildings.filter((b) => b.type === buildingType).length;
            if (buildingDef.maxPerCity && existingCount >= buildingDef.maxPerCity) {
              return;
            }
            const alreadyBuilt = city.buildings.some((b) => b.type === buildingType);
            if (alreadyBuilt) {
              return;
            }
            if (buildingDef.allowedTerrain) {
              if (buildingDef.allowedTerrain.includes('city')) {
                if (position && (position.x !== city.position.x || position.y !== city.position.y)) {
                  return;
                }
              } else if (position) {
                const targetTile = state.map.tiles[position.y]?.[position.x];
                if (targetTile && !buildingDef.allowedTerrain.includes(targetTile.terrain)) {
                  return;
                }
              }
            }
            const buildingId = uuidv4();
            city.buildings.push({
              id: buildingId,
              type: buildingType as any,
              isConstructed: true,
              tilePosition: position,
            });
            if (position) {
              const tile = state.map.tiles[position.y]?.[position.x];
              if (tile && !tile.buildingType) {
                tile.buildingType = buildingType as any;
              }
            }
            if (buildingType === 'walls') {
              city.hasWalls = true;
              city.cityDefenseBonus += buildingDef.effects.cityDefenseBonus;
            }
            if (buildingType === 'barracks') {
              city.combatBonus += buildingDef.effects.combatBonus;
            }
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
              cost: 5,
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
        // [수정 1] 개척자는 적이 있는 칸으로 이동 불가
        if (unit.type === 'settler') {
            return; 
        }

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
            if (myUnitsOnTile >= stackingLimit) {
              return;
            }
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
        if (state.currentPhase === 'cityManagement' && cityId) {
          const city = player.cities.find((c) => c.id === cityId);
          if (city?.hasActedThisTurn) return;
        }
        const card = createArmyCard(uuidv4(), type, tier, playerId, attack, health, name);
        player.armyCards.push(card);
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
      if (get().currentPhase !== 'research') {
        return false;
      }
      const player = get().players.find((p) => p.id === playerId);
      if (!player) return false;
      const tech = TECHNOLOGIES.find((t) => t.id === techId);
      if (!tech) return false;
      if (player.resources.trade < tech.cost) return false;
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
      get().recordResearch(playerId, techId, tech.name);
      return true;
    },

    combatState: initialCombatState,

    startCombat: (moverId: string, targetPosition: Position) => {
      const state = get();
      const mover = state.players.find((p) => p.id === moverId);
      if (!mover) return;
      const targetTile = state.map.tiles[targetPosition.y][targetPosition.x];
      let defenderId: string | null = null;
      for (const p of state.players) {
        if (p.id === moverId) continue;
        if (p.units.some((u) => targetTile.unitIds.includes(u.id))) {
          defenderId = p.id;
          break;
        }
        if (targetTile.cityId && p.cities.some((c) => c.id === targetTile.cityId)) {
          defenderId = p.id;
          break;
        }
      }
      if (!defenderId) return;
      const defender = state.players.find((p) => p.id === defenderId)!;
      let combatType: CombatType = 'field';
      let targetCityId: string | null = null;
      let isWalledCity = false;
      if (targetTile.cityId) {
        const city = defender.cities.find((c) => c.id === targetTile.cityId);
        if (city) {
          combatType = city.isCapital ? 'capital' : 'city';
          targetCityId = city.id;
          isWalledCity = city.hasWalls || city.isCapital;
        }
      }
      let attackerRoleId = moverId;
      let defenderRoleId = defenderId;
      let rolesSwapped = false;
      if (isWalledCity) {
        attackerRoleId = defenderId;
        defenderRoleId = moverId;
        rolesSwapped = true;
      }

      const moverMilitaryUnits = mover.units.filter(u => u.type === 'military' && state.selectedUnits.includes(u.id));
      const moverSettlerUnits = mover.units.filter(u => u.type === 'settler' && state.selectedUnits.includes(u.id));
      
      const defenderMilitaryUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'military');
      const defenderSettlerUnits = defender.units.filter(u => targetTile.unitIds.includes(u.id) && u.type === 'settler');

      // 선택된 이동 유닛이 없으면 (예: 단일 클릭 이동) 선택된 유닛이 military인지 체크
      const isMoverMilitary = moverMilitaryUnits.length > 0 || (mover.units.some(u => u.type === 'military' && u.id === state.selectedUnit));
      const isMoverSettler = moverSettlerUnits.length > 0 || (mover.units.some(u => u.type === 'settler' && u.id === state.selectedUnit));

      // [수정 2] 개척자 학살 체크 (필드전 + 방어측에 군사 없음 + 방어측에 개척자만 있음)
      const isSettlerMassacre = combatType === 'field' && 
                                defenderMilitaryUnits.length === 0 && 
                                defenderSettlerUnits.length > 0;

      // 최대 카드 수 계산
      let moverMaxCards: number;
      let defenderSideMaxCards: number;

      if (combatType === 'field') {
        const moverCount = Math.max(moverMilitaryUnits.length, isMoverMilitary ? 1 : 0);
        moverMaxCards = getAttackerMaxCards(moverCount);
        defenderSideMaxCards = getAttackerMaxCards(Math.max(defenderMilitaryUnits.length, 1));
      } else {
        const moverCount = Math.max(moverMilitaryUnits.length, isMoverMilitary ? 1 : 0);
        moverMaxCards = getAttackerMaxCards(moverCount);
        defenderSideMaxCards = CITY_CAPITAL_MAX_CARDS;
      }

      const attackerMaxCards = rolesSwapped ? defenderSideMaxCards : moverMaxCards;
      const defenderMaxCards = rolesSwapped ? moverMaxCards : defenderSideMaxCards;
      const attackerPlayer = state.players.find((p) => p.id === attackerRoleId)!;
      const defenderPlayer = state.players.find((p) => p.id === defenderRoleId)!;

      // 카드 준비: 무작위 뽑기 (Fog of War) 및 개척자 처리
      const prepareCards = (player: Player, max: number, hasSettler: boolean, hasMilitary: boolean) => {
        let cards: ArmyCard[] = [];
        
        if (hasMilitary) {
            // 보유한 부대 카드 중 '최대 배치 수'만큼 무작위로 뽑음
            const shuffled = shuffleArray(player.armyCards);
            cards = shuffled.slice(0, max);
        }
        // 개척자만 있으면 빈 배열 반환
        return cards;
      };

      const attackerAvailableCards = prepareCards(
          attackerPlayer, 
          attackerMaxCards, 
          rolesSwapped ? defenderSettlerUnits.length > 0 : isMoverSettler, 
          rolesSwapped ? (defenderMilitaryUnits.length > 0 || combatType !== 'field') : isMoverMilitary
      );
      
      const defenderAvailableCards = prepareCards(
          defenderPlayer, 
          defenderMaxCards, 
          rolesSwapped ? isMoverSettler : defenderSettlerUnits.length > 0, 
          rolesSwapped ? isMoverMilitary : (defenderMilitaryUnits.length > 0 || combatType !== 'field')
      );

      // 보너스 계산
      let attackerCombatBonus = 0;
      for (const city of attackerPlayer.cities) {
        attackerCombatBonus += city.combatBonus;
      }
      let defenderCombatBonus = 0;
      for (const city of defenderPlayer.cities) {
        defenderCombatBonus += city.combatBonus;
      }
      
      let attackerCityDefenseBonus = 0;
      let defenderCityDefenseBonus = 0;

      if (combatType !== 'field' && targetCityId) {
        const city = defender.cities.find((c) => c.id === targetCityId);
        if (city) {
          if (rolesSwapped) {
            attackerCityDefenseBonus = city.cityDefenseBonus;
          } else {
            defenderCityDefenseBonus = city.cityDefenseBonus;
          }
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
          attackerAvailableCards,
          defenderAvailableCards,
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
          
          // [수정 3] 개척자 학살 시 Loot 단계로 바로 건너뜀
          phase: isSettlerMassacre ? 'loot' : 'placement',
          
          attackerCombatBonus,
          defenderCombatBonus,
          attackerCityDefenseBonus,
          defenderCityDefenseBonus,
          attackerFinalScore: 0,
          defenderFinalScore: 0,
          
          // [수정 4] 승자 즉시 결정
          winner: isSettlerMassacre ? 'attacker' : null,
          winnerPlayerId: isSettlerMassacre ? attackerRoleId : null,
          loserPlayerId: isSettlerMassacre ? defenderRoleId : null,
          
          lootSelections: [],
          maxLootSelections: (isSettlerMassacre || combatType === 'field') ? 1 : (combatType === 'city' ? 2 : 0),
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
        const expectedTurn = isAttacker ? 'attacker' : 'defender';
        if (placement.currentTurn !== expectedTurn) return;

        // [수정] 배치 제한 로직 단순화: 내 손에 카드가 있으면 낼 수 있음
        
        const cardIndex = availableCards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return;
        const card = availableCards.splice(cardIndex, 1)[0];
        
        let targetBf = null;

        if (battlefieldId === null) {
          const newBf = {
            id: uuidv4(),
            attackerCard: isAttacker ? card : null,
            defenderCard: isAttacker ? null : card,
            resolved: false,
            result: null,
          };
          cs.battlefields.push(newBf);
          targetBf = newBf;
        } else {
          const bf = cs.battlefields.find((b) => b.id === battlefieldId);
          if (!bf) return;
          if (isAttacker) {
            if (bf.attackerCard) return;
            bf.attackerCard = card;
          } else {
            if (bf.defenderCard) return;
            bf.defenderCard = card;
          }
          // 재배치 시 다시 미해결 상태로 변경
          bf.resolved = false;
          targetBf = bf;
        }

        // 즉시 전투 실행
        if (targetBf && targetBf.attackerCard && targetBf.defenderCard) {
            const result = resolvePairedFight(targetBf.attackerCard, targetBf.defenderCard);
            targetBf.result = result;
            targetBf.resolved = true;

            // 데미지 적용
            if (result.firstStriker === 'attacker') {
                targetBf.defenderCard.health -= result.attackerDamageDealt;
                if (targetBf.defenderCard.health > 0) {
                    targetBf.attackerCard.health -= result.defenderDamageDealt;
                }
            } else if (result.firstStriker === 'defender') {
                 targetBf.attackerCard.health -= result.defenderDamageDealt;
                 if (targetBf.attackerCard.health > 0) {
                     targetBf.defenderCard.health -= result.attackerDamageDealt;
                 }
            } else {
                 targetBf.defenderCard.health -= result.attackerDamageDealt;
                 targetBf.attackerCard.health -= result.defenderDamageDealt;
            }

            // 사망 처리: 묘지로 보내고 슬롯 비우기 (Refill 가능하도록)
            if (targetBf.attackerCard.health <= 0) {
              targetBf.attackerCard.health = 0;
              cs.graveyard.push(targetBf.attackerCard);
              targetBf.attackerCard = null;
              targetBf.resolved = false; // 다시 미해결
            }
            if (targetBf.defenderCard && targetBf.defenderCard.health <= 0) {
              targetBf.defenderCard.health = 0;
              cs.graveyard.push(targetBf.defenderCard);
              targetBf.defenderCard = null;
              targetBf.resolved = false;
            }
        }

        if (isAttacker) placement.attackerDeployCount++;
        else placement.defenderDeployCount++;
        
        placement.currentTurn = isAttacker ? 'defender' : 'attacker';
        
        if (isAttacker) placement.attackerPassed = false;
        else placement.defenderPassed = false;
      });
    },

    passTurn: (playerId: string) => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive || cs.phase !== 'placement') return;
        const isAttacker = cs.attackerRoleId === playerId;
        if (isAttacker) cs.placement.attackerPassed = true;
        else cs.placement.defenderPassed = true;

        if (cs.placement.attackerPassed && cs.placement.defenderPassed) {
          cs.phase = 'resolution';
        } else {
          cs.placement.currentTurn = isAttacker ? 'defender' : 'attacker';
          // 상대방 상태 확인
          const otherPassed = isAttacker ? cs.placement.defenderPassed : cs.placement.attackerPassed;
          const otherHandEmpty = isAttacker ? (cs.defenderAvailableCards.length === 0) : (cs.attackerAvailableCards.length === 0);

          // [수정] 상대방 패스 조건: 이미 패스했거나 손패가 없을 때만
          if (otherPassed || otherHandEmpty) {
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
        attackerCityDefenseBonus: cs.attackerCityDefenseBonus,
        defenderCityDefenseBonus: cs.defenderCityDefenseBonus,
        originalMoverId: cs.originalMoverId!,
        attackerRoleId: cs.attackerRoleId!,
      });
      set((state) => {
        const cs = state.combatState;
        cs.battlefields = result.resolvedBattlefields;
        
        const uniqueGraveyard = [...cs.graveyard];
        result.graveyard.forEach(c => {
            if (!uniqueGraveyard.some(gc => gc.id === c.id)) uniqueGraveyard.push(c);
        });
        cs.graveyard = uniqueGraveyard;
        
        cs.attackerFinalScore = result.attackerFinalScore;
        cs.defenderFinalScore = result.defenderFinalScore;
        cs.winner = result.winner;
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
        if (cs.combatType === 'capital' && cs.winnerPlayerId === cs.originalMoverId) {
          cs.maxLootSelections = 0;
          cs.phase = 'result';
          return;
        }
        if (cs.combatType === 'city' && cs.winnerPlayerId === cs.originalMoverId) {
          cs.maxLootSelections = 2;
        } else {
          cs.maxLootSelections = 1;
        }
        cs.phase = 'loot';
      });
    },

    selectLoot: (choice: 'trade' | 'culture'|'mercy') => {
      set((state) => {
        const cs = state.combatState;
        if (!cs.isActive || cs.phase !== 'loot') return;
        if (choice === 'mercy') {
            cs.log.push({ message: "승자가 패자에게 자비를 베풀었습니다. (전리품 획득 종료)" });
            cs.phase = 'result'; // 즉시 결과 화면으로 이동
            return;
        }
        const loser = state.players.find((p) => p.id === cs.loserPlayerId);
        if (!loser) return;
        const available = choice === 'trade' ? loser.resources.trade : loser.resources.culture;
        const amount = Math.min(LOOT_MAX_PER_SELECTION, available);
        cs.lootSelections.push({ type: choice, amount });
        
        if (choice === 'trade') {
          loser.resources.trade = Math.max(0, loser.resources.trade - amount);
        } else {
          loser.resources.culture = Math.max(0, loser.resources.culture - amount);
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

        // 전리품 지급 및 상한 체크
        if (winner && state.combatState.lootSelections.length > 0) {
          for (const loot of state.combatState.lootSelections) {
            if (loot.type === 'trade') {
              winner.resources.trade = Math.min(27, winner.resources.trade + loot.amount);
            } else {
              winner.resources.culture += loot.amount;
            }
          }
        }

        // 묘지 처리: 덱에서 제거
        const graveyardIds = new Set(state.combatState.graveyard.map((c) => c.id));
        if (winner) {
          winner.armyCards = winner.armyCards.filter((c) => !graveyardIds.has(c.id));
        }
        if (loser) {
          loser.armyCards = loser.armyCards.filter((c) => !graveyardIds.has(c.id));
        }

        const targetTile = state.map.tiles[targetPos.y][targetPos.x];
        
        // 공격자 승리 시 처리
        if (mover && winnerId === moverId) {
          const originalDefenderId = state.combatState.originalDefenderId;
          const defenderPlayer = state.players.find((p) => p.id === originalDefenderId);
          
          // 방어 유닛 제거
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

          // 공격 유닛 이동
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

          // 도시 점령 시 처리: 초토화 (파괴)
          if (state.combatState.combatType === 'city' && state.combatState.targetCityId && defenderPlayer) {
            const cityIndex = defenderPlayer.cities.findIndex(
              (c) => c.id === state.combatState.targetCityId
            );
            if (cityIndex !== -1) {
              // 도시 삭제
              defenderPlayer.cities.splice(cityIndex, 1);
              
              // 해당 타일 및 주변 8칸 초기화 (초토화)
              const directions = [
                  {x:0, y:0}, {x:-1,y:-1}, {x:0,y:-1}, {x:1,y:-1}, 
                  {x:-1,y:0}, {x:1,y:0}, {x:-1,y:1}, {x:0,y:1}, {x:1,y:1}
              ];
              directions.forEach(d => {
                  const nx = targetPos.x + d.x;
                  const ny = targetPos.y + d.y;
                  if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
                      const tile = state.map.tiles[ny][nx];
                      tile.ownerId = null;
                      tile.cityId = null;
                      tile.buildingType = null;
                      // 유닛은 유지 (점령군은 그 자리에 있음)
                  }
              });
            }
          }
          
          if (state.combatState.combatType === 'capital') {
            state.winner = moverId;
            state.winCondition = 'military';
            state.isGameOver = true;
          }

        } else if (mover && winnerId !== moverId) {
          // 방어자 승리 (공격자 패배)
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
        if (player.technologies.some((t) => t.id === 'space_flight')) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'science';
            s.isGameOver = true;
          });
          return;
        }
        if (player.resources.currency >= 15) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'economic';
            s.isGameOver = true;
          });
          return;
        }
        if (player.cultureTrack >= 20) {
          set((s) => {
            s.winner = player.id;
            s.winCondition = 'culture';
            s.isGameOver = true;
          });
          return;
        }
      }
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
          return currentPhase === 'movement';
        default:
          return false;
      }
    },

    turnResearchResults: [],
    showResearchResults: false,

    recordResearch: (playerId: string, techId: string, techName: string) => {
      set((state) => {
        const player = state.players.find((p) => p.id === playerId);
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

    startDevCombat: (
      attackerCards, 
      defenderCards, 
      attackerBonus, 
      defenderBonus,
      attackerCityDefense,
      defenderCityDefense,
      combatType
    ) => {
      const devAttackerId = 'dev-attacker';
      const devDefenderId = 'dev-defender';

      set((state) => {
        if (!state.players.find(p => p.id === devAttackerId)) {
            state.players.push({
                id: devAttackerId, name: 'DEV Attacker', color: 'red', nation: 'rome',
                resources: createInitialResources(), cities: [], units: [], armyCards: [], technologies: [], 
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false
            });
        }
        if (!state.players.find(p => p.id === devDefenderId)) {
            state.players.push({
                id: devDefenderId, name: 'DEV Defender', color: 'blue', nation: 'china',
                resources: createInitialResources(), cities: [], units: [], armyCards: [], technologies: [], 
                government: 'despotism', cultureTrack: 0, hasCapital: true, isEliminated: false, stackingLimitBonus: 0, hasCollectedTrade: false
            });
        }

        state.combatState = {
          isActive: true,
          originalMoverId: devAttackerId,
          originalDefenderId: devDefenderId,
          attackerRoleId: devAttackerId,
          defenderRoleId: devDefenderId,
          combatType: combatType,
          targetTilePosition: { x: -1, y: -1 },
          targetCityId: null,
          isWalledCity: combatType !== 'field',
          rolesSwapped: false,
          
          attackerAvailableCards: attackerCards,
          defenderAvailableCards: defenderCards,
          
          battlefields: [],
          placement: {
            currentTurn: 'defender',
            attackerPassed: false,
            defenderPassed: false,
            attackerDeployCount: 0,
            defenderDeployCount: 0,
            attackerMaxCards: attackerCards.length, 
            defenderMaxCards: defenderCards.length,
          },
          graveyard: [],
          phase: 'placement',
          
          attackerCombatBonus: attackerBonus,
          defenderCombatBonus: defenderBonus,
          attackerCityDefenseBonus: attackerCityDefense,
          defenderCityDefenseBonus: defenderCityDefense,
          
          attackerFinalScore: 0,
          defenderFinalScore: 0,
          winner: null,
          winnerPlayerId: null,
          loserPlayerId: null,
          lootSelections: [],
          maxLootSelections: 1,
          log: [],
        };
      });
    },
  }))
);

function getPlayerOrder(firstPlayerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    order.push((firstPlayerIndex + i) % playerCount);
  }
  return order;
}

function generateMap(width: number, height: number): GameMap {
  const resources = ['wheat', 'iron', 'gold', 'silk', 'incense', 'spice', 'none'] as const;
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        terrain = Math.random() < 0.7 ? 'water' : 'grassland';
      } else {
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
