import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, GameSetupState } from '../types/storeTypes';
import { NationType, Position, Player, createInitialResources, createCity, createUnit, getStartPositionOptions } from '../../types';
import { generateMap, setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';

export interface GameSetupSlice {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  startGame: () => void;
}

const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
};

const PLAYER_COLORS_LIST = ['red', 'blue', 'green', 'yellow'] as const;

export const createGameSetupSlice: StateCreator<GameStore, [["zustand/immer", never]], [], GameSetupSlice> = (set) => ({
  setupState: initialSetupState,

  initSetup: (playerCount: number, playerNames: string[]) => {
    const map = generateMap(16, 16);
    const availableNations: NationType[] = ['america', 'rome', 'egypt', 'china', 'russia', 'germany'];
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: uuidv4(),
        name: playerNames[i],
        color: PLAYER_COLORS_LIST[i],
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
        hasResearchedThisTurn: false,
        luxuryResources: createInitialLuxuryResources(),
        spies: 3,
        greatPeople: 0,
        nuclearMaterial: 0,
        cultureEventCards: [],
        pendingGreatPerson: false,
        pendingCardDraw: 0,
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
      // 인접 도시 체크
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
        // 초기 유닛 배치
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
});