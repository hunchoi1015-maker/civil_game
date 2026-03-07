// src/store/slices/gameSetupSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, GameSetupState } from '../types/storeTypes';
import { NationType, Position, Player, createInitialResources, createCity, createUnit, getStartPositionOptions, UnitType } from '../../types';
import { generateMap, setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';
import { TECHNOLOGIES } from '../../constants/technologies';

export interface GameSetupSlice {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  placeInitialUnit: (playerIndex: number, position: Position) => void; // 🌟 [신규] 초기 유닛 배치 액션
  startGame: () => void;
}

const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
  pendingInitialUnits: {}, // 초기화
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
        unplacedGreatPeople:[],
        nuclearMaterial: 3,
        cultureEventCards: [],
        pendingGreatPerson: false,
        pendingCardDraw: 0,
        secretResources: [],
        hasUsedAngkorWatThisTurn: false, 
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

      // 시장 자원 
      state.marketResources = {
        spice: playerCount,
        wheat: playerCount,
        silk: playerCount,
        iron: playerCount,
      };

      state.setupState = {
        phase: 'capitalSelect', // 테스트 끝나면 nationSelect로 돌리기
        currentSetupPlayer: 0,
        selectedNations: availableNations.slice(0, playerCount),
        capitalPositionOptions: capitalOptions,
        pendingInitialUnits: {},
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
      
      // 🌟 [추가] 수도를 지으면 주변 3x3 타일의 시야(전장의 안개)가 밝혀집니다!
      for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
              const nx = position.x + dx;
              const ny = position.y + dy;
              if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
                  state.map.tiles[ny][nx].isExplored = true;
              }
          }
      }

      if (playerIndex < state.players.length - 1) {
        state.setupState.currentSetupPlayer = playerIndex + 1;
      } else {
        state.setupState.phase = 'initialUnitSelect';
        state.setupState.currentSetupPlayer = 0;
        
        state.players.forEach((p) => {
            const initialQueue: UnitType[] = ['military', 'settler'];
            if (p.nation === 'russia') {
                initialQueue.unshift('military'); 
            }
            state.setupState.pendingInitialUnits![p.id] = initialQueue;
        });
      }
    });
  },

  placeInitialUnit: (playerIndex: number, position: Position) => {
      set((state) => {
          const player = state.players[playerIndex];
          const queue = state.setupState.pendingInitialUnits?.[player.id] || [];
          
          if (queue.length === 0) return;

          const unitTypeToPlace = queue.shift(); 
          if (!unitTypeToPlace) return;

          const unitId = uuidv4();
          const unit = createUnit(unitId, unitTypeToPlace, player.id, position);
          player.units.push(unit);
          state.map.tiles[position.y][position.x].unitIds.push(unitId);

          // 🌟 [수정 1] 현재 플레이어의 큐에 유닛이 아직 남아있다면 턴을 넘기지 않고 함수 종료!
          if (queue.length > 0) {
              return;
          }

          // 🌟 (이하 큐가 비었을 때만 다음 사람을 찾는 로직 실행)
          let nextPlayerFound = false;
          let nextIdx = (playerIndex + 1) % state.players.length;
          
          for (let count = 0; count < state.players.length; count++) {
              const nextP = state.players[nextIdx];
              const nextQueue = state.setupState.pendingInitialUnits?.[nextP.id];
              if (nextQueue && nextQueue.length > 0) {
                  state.setupState.currentSetupPlayer = nextIdx;
                  nextPlayerFound = true;
                  break;
              }
              nextIdx = (nextIdx + 1) % state.players.length;
          }

          if (!nextPlayerFound) {
              state.setupState.phase = 'ready';
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

      // 🌟 [추가] 게임 시작 시 각 플레이어에게 국가 고유(시작) 기술을 무료로 지급합니다!
      state.players.forEach(player => {
          const startingTechDef = TECHNOLOGIES.find(t => t.isStartingTechFor === player.nation);
          if (startingTechDef && !player.technologies.some(t => t.id === startingTechDef.id)) {
              player.technologies.push({
                  ...startingTechDef,
                  tokensOnCard: 0,
                  abilityUsedThisTurn: false,
                  usedPhases: []
              });
          }
      });
    });
  },
});