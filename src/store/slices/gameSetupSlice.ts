// src/store/slices/gameSetupSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, GameSetupState } from '../types/storeTypes';
import { NationType, Position, Player, createInitialResources, createCity, createUnit, getStartPositionOptions, UnitType } from '../../types';
import { generateMap, setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';

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
      
      if (playerIndex < state.players.length - 1) {
        state.setupState.currentSetupPlayer = playerIndex + 1;
      } else {
        // 🌟 [수정] 모든 수도가 지어지면 ready가 아니라 유닛 배치 페이즈로 전환!
        state.setupState.phase = 'initialUnitSelect';
        state.setupState.currentSetupPlayer = 0;
        
        // 각 플레이어별 초기 유닛 큐 세팅 (러시아는 군사 1개 추가)
        state.players.forEach((p) => {
            const initialQueue: UnitType[] = ['military', 'settler'];
            if (p.nation === 'russia') {
                initialQueue.unshift('military'); // 러시아: 군사, 군사, 개척자
            }
            state.setupState.pendingInitialUnits![p.id] = initialQueue;
        });
      }
    });
  },

  // 🌟 [신규] 초기 유닛 1개 배치 후 턴 넘기기 로직
  placeInitialUnit: (playerIndex: number, position: Position) => {
      set((state) => {
          const player = state.players[playerIndex];
          const queue = state.setupState.pendingInitialUnits?.[player.id] || [];
          
          if (queue.length === 0) return; // 이미 다 배치함

          const unitTypeToPlace = queue.shift(); // 큐에서 맨 앞 유닛 꺼내기
          if (!unitTypeToPlace) return;

          // 유닛 생성 및 맵 배치
          const unitId = uuidv4();
          const unit = createUnit(unitId, unitTypeToPlace, player.id, position);
          player.units.push(unit);
          state.map.tiles[position.y][position.x].unitIds.push(unitId);

          // 다음 차례 계산 (아직 유닛을 덜 배치한 사람 찾기)
          let nextPlayerFound = false;
          let nextIdx = (playerIndex + 1) % state.players.length;
          
          // 한 바퀴 돌면서 큐가 남은 사람 찾기
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

          // 아무도 큐가 남아있지 않다면 (모두 배치 완료) -> 게임 시작!
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
    });
  },
});