import { generateArmyStats } from '../helpers/armyHelpers';

// src/store/slices/gameSetupSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, GameSetupState } from '../types/storeTypes';
import { NationType, Position, Player, createInitialResources, createCity, createUnit, UnitType } from '../../types';
import { generateMap, setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';
import { TECHNOLOGIES } from '../../constants/technologies';
import { NATIONS } from '../../types/nation'; 
import { drawRandomGreatPerson } from '../../constants/greatPerson';
import { WONDERS } from '../../types/wonder'; // 🌟 불가사의 데이터 임포트

export interface GameSetupSlice {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  placeInitialUnit: (playerIndex: number, position: Position) => void;
  placeInitialWonder: (playerIndex: number, position: Position) => void; // 🌟 신규 액션
  startGame: () => void;
}

// ... (initialSetupState, PLAYER_COLORS_LIST, initSetup, selectNation은 기존과 동일하므로 생략하지 않고 모두 포함) ...
const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
  pendingInitialUnits: {},
  pendingInitialWonders: {}, // 초기화
};

const PLAYER_COLORS_LIST = ['red', 'blue', 'green', 'yellow'] as const;

export const createGameSetupSlice: StateCreator<GameStore, [["zustand/immer", never]], [], GameSetupSlice> = (set) => ({
  setupState: initialSetupState,

  initSetup: (playerCount: number, playerNames: string[]) => {
    // ... (기존과 동일)
    const map = generateMap(16, 16);
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: uuidv4(),
        name: playerNames[i] || `Player ${i + 1}`,
        color: PLAYER_COLORS_LIST[i],
        nation: 'america',
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
    const allTiles: Position[] = [];
    for(let y = 0; y < 16; y++) {
      for(let x = 0; x < 16; x++) {
        allTiles.push({x, y});
      }
    }
    for (let i = 0; i < playerCount; i++) {
      capitalOptions.push(allTiles); 
    }
    set((state) => {
      state.id = uuidv4();
      state.players = players;
      state.map = map;
      state.marketResources = { spice: playerCount, wheat: playerCount, silk: playerCount, iron: playerCount };
      state.setupState = {
        phase: 'nationSelect', 
        currentSetupPlayer: 0,
        selectedNations: new Array(playerCount).fill(null),
        capitalPositionOptions: capitalOptions,
        pendingInitialUnits: {},
        pendingInitialWonders: {},
      };
    });
  },

  selectNation: (playerIndex: number, nation: NationType) => {
    // ... (기존과 동일)
    set((state) => {
      if (state.setupState.selectedNations.includes(nation)) return;
      state.setupState.selectedNations[playerIndex] = nation;
      state.players[playerIndex].nation = nation;
      if (playerIndex < state.players.length - 1) {
        state.setupState.currentSetupPlayer = playerIndex + 1;
      } else {
        state.setupState.phase = 'capitalSelect';
        state.setupState.currentSetupPlayer = 0;
      }
    });
  },

  selectCapitalPosition: (playerIndex: number, position: Position) => {
    set((state) => {
      const player = state.players[playerIndex];
      const playerId = player.id;
      
      const capitalId = uuidv4();
      const capital = createCity(capitalId, `${player.name}의 수도`, playerId, position, true);
      player.cities.push(capital);
      player.hasCapital = true;
      state.map.tiles[position.y][position.x].cityId = capitalId;
      state.map.tiles[position.y][position.x].ownerId = playerId;
      setAdjacentTilesOwner(state.map, position, playerId);
      
      for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
              const nx = position.x + dx;
              const ny = position.y + dy;
              if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
                  state.map.tiles[ny][nx].isExplored = true;
              }
          }
      }

      // 🌟 [추가 1] 러시아 등 스태킹 한도 보너스를 여기서 미리 적용!
      const nationBonus = NATIONS[player.nation].startingBonus;
      if (nationBonus.stackingLimitBonus) {
          player.stackingLimitBonus = nationBonus.stackingLimitBonus;
      }

      // 🌟 [추가 2] 이집트 특성: 고대 불가사의 중 1개 랜덤 획득 큐에 넣기
      if (player.nation === 'egypt') {

        const takenWonders = [
              ...Object.values(state.setupState.pendingInitialWonders || {}),
              ...state.players.flatMap(p => p.builtWonders || [])
          ];

        const ancientWonders = Object.values(WONDERS).filter(w => w.era === 'ancient' && !takenWonders.includes(w.type));
          
        if (ancientWonders.length > 0) {
              const randomWonder = ancientWonders[Math.floor(Math.random() * ancientWonders.length)];
              if (!state.setupState.pendingInitialWonders) state.setupState.pendingInitialWonders = {};
              state.setupState.pendingInitialWonders[player.id] = randomWonder.type;
        }
      }

      if (playerIndex < state.players.length - 1) {
        state.setupState.currentSetupPlayer = playerIndex + 1;
      } else {
        state.setupState.phase = 'initialUnitSelect';
        state.setupState.currentSetupPlayer = 0;
        state.players.forEach((p) => {
            const initialQueue: UnitType[] = ['military', 'settler'];
            if (p.nation === 'russia') initialQueue.unshift('military'); 
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

          // 유닛이 남았다면 대기
          if (queue.length > 0) return;
          
          // 🌟 [수정] 유닛 배치가 끝났어도 이집트 불가사의 큐가 남아있다면 턴을 넘기지 않음!
          if (state.setupState.pendingInitialWonders?.[player.id]) return;

          // 다음 플레이어 찾기 (헬퍼 함수로 분리하면 좋지만 여기선 인라인 유지)
          let nextPlayerFound = false;
          let nextIdx = (playerIndex + 1) % state.players.length;
          
          for (let count = 0; count < state.players.length; count++) {
              const nextP = state.players[nextIdx];
              const nextQueue = state.setupState.pendingInitialUnits?.[nextP.id];
              const nextWonder = state.setupState.pendingInitialWonders?.[nextP.id];
              if ((nextQueue && nextQueue.length > 0) || nextWonder) {
                  state.setupState.currentSetupPlayer = nextIdx;
                  nextPlayerFound = true;
                  break;
              }
              nextIdx = (nextIdx + 1) % state.players.length;
          }

          if (!nextPlayerFound) state.setupState.phase = 'ready';
      });
  },

  // 🌟 [신규 액션] 이집트의 조기 불가사의 배치 함수
  placeInitialWonder: (playerIndex: number, position: Position) => {
      set((state) => {
          const player = state.players[playerIndex];
          const wonderType = state.setupState.pendingInitialWonders?.[player.id];
          if (!wonderType) return;

          const tile = state.map.tiles[position.y][position.x];

          // 🌟 [추가] 기존 건물/불가사의 덮어쓰기 (파괴)
          if (tile.wonder) {
              const oldWonder = tile.wonder.type;
              const oldOwner = state.players.find(p => p.id === tile.ownerId);
              if (oldOwner) {
                  oldOwner.builtWonders = oldOwner.builtWonders?.filter(w => w !== oldWonder);
                  for (const c of oldOwner.cities) {
                      c.builtWonders = c.builtWonders?.filter(w => w !== oldWonder);
                  }
              }
          }
          if (tile.buildingType) {
              const oldOwner = state.players.find(p => p.id === tile.ownerId);
              if (oldOwner) {
                  for (const c of oldOwner.cities) {
                      c.buildings = c.buildings.filter(b => b.tilePosition?.x !== position.x || b.tilePosition?.y !== position.y);
                  }
              }
              tile.buildingType = null;
          }

          // 새 불가사의 건설
          tile.wonder = { type: wonderType as any };
          tile.ownerId = player.id; 

          // 플레이어/도시 상태 반영
          const capital = player.cities.find(c => c.isCapital);
          if (capital) {
              if (!capital.builtWonders) capital.builtWonders = [];
              capital.builtWonders.push(wonderType as any);
          }
          if (!player.builtWonders) player.builtWonders = [];
          player.builtWonders.push(wonderType as any);

          // 큐에서 제거
          if (state.setupState.pendingInitialWonders) {
              delete state.setupState.pendingInitialWonders[player.id];
          }

          // 턴 넘기기 로직
          let nextPlayerFound = false;
          let nextIdx = (playerIndex + 1) % state.players.length;
          for (let count = 0; count < state.players.length; count++) {
              const nextP = state.players[nextIdx];
              const nextQueue = state.setupState.pendingInitialUnits?.[nextP.id];
              const nextWonder = state.setupState.pendingInitialWonders?.[nextP.id];
              if ((nextQueue && nextQueue.length > 0) || nextWonder) {
                  state.setupState.currentSetupPlayer = nextIdx;
                  nextPlayerFound = true;
                  break;
              }
              nextIdx = (nextIdx + 1) % state.players.length;
          }

          if (!nextPlayerFound) state.setupState.phase = 'ready';
      });
  },

  startGame: () => {
    set((state) => {
      state.turn = 1;
      state.currentPhase = 'start';
      state.currentPlayerIndex = 0;
      state.firstPlayerIndex = 0;
      state.phaseComplete = new Array(state.players.length).fill(false);

      // 🌟 게임 시작 시 모든 플레이어의 국가별 보너스 지급 처리
      state.players.forEach(player => {
          const nationDef = NATIONS[player.nation as keyof typeof NATIONS];
          if (!nationDef) return;

          const bonus = nationDef.startingBonus;

          // 1. 시작 기술 지급
          const techsToUnlock = [...(bonus.unlockedTechs || [])];
          const startingTechDef = TECHNOLOGIES.find(t => t.isStartingTechFor === player.nation);
          if (startingTechDef && !techsToUnlock.includes(startingTechDef.id)) {
              techsToUnlock.push(startingTechDef.id);
          }

          techsToUnlock.forEach(techId => {
              const techDef = TECHNOLOGIES.find(t => t.id === techId);
              if (techDef && !player.technologies.some(t => t.id === techId)) {
                  player.technologies.push({
                      ...techDef,
                      tokensOnCard: 0,
                      abilityUsedThisTurn: false,
                      usedPhases: []
                  });
              }
          });

          // 2. 시작 정치 체제 적용
          if (bonus.startingGovernment) {
              player.government = bonus.startingGovernment as any;
          }

          // 3. 위인 지급 (미국 특성 등)
          if (bonus.greatPeople) {
              player.greatPeople += bonus.greatPeople;
              if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
              for(let i = 0; i < bonus.greatPeople; i++) {
                  player.unplacedGreatPeople.push(drawRandomGreatPerson());
              }
          }

          // 4. 시작 부대 카드 지급 (독일 특성 등)
          if (bonus.armyCards) {
              bonus.armyCards.forEach(ac => {
                  for (let i = 0; i < ac.count; i++) {
                      // 랜덤 성향으로 능력치 굴리기
                      const stats = generateArmyStats(ac.tier);
                      
                      player.armyCards.push({
                          id: uuidv4(),
                          type: ac.type,
                          tier: ac.tier,
                          attack: stats.attack, 
                          health: stats.maxHealth, 
                          maxHealth: stats.maxHealth,
                          ownerId: player.id,
                          name: `${nationDef.name} 정예부대`,
                          statProfile: stats.profile // 성향 저장
                      });
                  }
              });
          }

          // 5. 스택 제한 패시브
          if (bonus.stackingLimitBonus) {
              player.stackingLimitBonus = bonus.stackingLimitBonus;
          }

          // 6. 시작 성벽 지급 (중국 특성 등)
          if (bonus.hasWalls) {
              const capital = player.cities.find(c => c.isCapital);
              if (capital) {
                  capital.hasWalls = true;
                  capital.cityDefenseBonus += 2;
              }
          }
      });
    });
  },
});