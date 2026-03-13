// src/store/slices/gameSetupSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, GameSetupState } from '../types/storeTypes';
import { NationType, Position, Player, createInitialResources, createCity, createUnit, getStartPositionOptions, UnitType } from '../../types';
import { generateMap, setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';
import { TECHNOLOGIES } from '../../constants/technologies';
import { NATIONS } from '../../types/nation';
// 🌟 위인 뽑기 함수 최상단 임포트 (require 대신 사용)
import { drawRandomGreatPerson } from '../../constants/greatPerson'; 
import { generateArmyStats } from '../helpers/armyHelpers';

export interface GameSetupSlice {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  placeInitialUnit: (playerIndex: number, position: Position) => void;
  startGame: () => void;
}

const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
  pendingInitialUnits: {},
};

const PLAYER_COLORS_LIST = ['red', 'blue', 'green', 'yellow'] as const;

export const createGameSetupSlice: StateCreator<GameStore, [["zustand/immer", never]], [], GameSetupSlice> = (set) => ({
  setupState: initialSetupState,

  initSetup: (playerCount: number, playerNames: string[]) => {
    const map = generateMap(16, 16);

    // 테스트용 함수
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        map.tiles[y][x].isExplored = true;
      }
    }

    const players: Player[] = [];
    
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: uuidv4(),
        name: playerNames[i] || `Player ${i + 1}`,
        color: PLAYER_COLORS_LIST[i],
        nation: 'america', // 🌟 더미 데이터(선택 페이즈에서 실제 선택한 국가로 덮어씌워집니다)
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
        unplacedGreatPeople: [],
        nuclearMaterial: 3,
        cultureEventCards: [],
        pendingGreatPerson: false,
        pendingCardDraw: 0,
        secretResources: [],
        hasUsedAngkorWatThisTurn: false,
      });
    }

    /*
    const capitalOptions: Position[][] = [];
    for (let i = 0; i < playerCount; i++) {
      capitalOptions.push(getStartPositionOptions(i, 16, 16));
    }
    */
   const capitalOptions: Position[][] = [];
    const allTiles: Position[] = [];
    for(let y = 0; y < 16; y++) {
      for(let x = 0; x < 16; x++) {
        allTiles.push({x, y});
      }
    }


    set((state) => {
      state.id = uuidv4();
      state.players = players;
      state.map = map;

      state.marketResources = {
        spice: playerCount,
        wheat: playerCount,
        silk: playerCount,
        iron: playerCount,
      };

      state.setupState = {
        phase: 'nationSelect', // 첫 단계: 국가 선택
        currentSetupPlayer: 0,
        selectedNations: new Array(playerCount).fill(null), // 아무도 선택하지 않은 상태로 초기화
        capitalPositionOptions: capitalOptions,
        pendingInitialUnits: {},
      };
    });
  },

  selectNation: (playerIndex: number, nation: NationType) => {
    set((state) => {
      // 이미 다른 사람이 선택한 국가인지 확인
      if (state.setupState.selectedNations.includes(nation)) {
        return;
      }

      state.setupState.selectedNations[playerIndex] = nation;
      state.players[playerIndex].nation = nation;

      // 다음 플레이어로 턴 넘기기
      if (playerIndex < state.players.length - 1) {
        state.setupState.currentSetupPlayer = playerIndex + 1;
      } else {
        // 전원 선택이 끝났다면 수도 선택 단계로 전환
        state.setupState.phase = 'capitalSelect';
        state.setupState.currentSetupPlayer = 0;
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
      
      // 수도 주변 시야 확보
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
            // 🌟 러시아 시작 보너스: 군사 유닛 +1
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

          if (queue.length > 0) {
              return;
          }

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