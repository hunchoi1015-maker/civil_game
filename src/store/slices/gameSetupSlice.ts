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
import { WONDERS } from '../../types/wonder'; 
import { generateArmyStats } from '../helpers/armyHelpers';

export interface GameSetupSlice {
  setupState: GameSetupState;
  initSetup: (playerCount: number, playerNames: string[]) => void;
  selectNation: (playerIndex: number, nation: NationType) => void;
  selectCapitalPosition: (playerIndex: number, position: Position) => void;
  placeInitialUnit: (playerIndex: number, position: Position) => void;
  placeInitialWonder: (playerIndex: number, position: Position) => void;
  startGame: () => void;
}

const initialSetupState: GameSetupState = {
  phase: 'nationSelect',
  currentSetupPlayer: 0,
  selectedNations: [],
  capitalPositionOptions: [],
  pendingInitialUnits: {},
  pendingInitialWonders: {},
};

const PLAYER_COLORS_LIST = ['red', 'blue', 'green', 'yellow'] as const;

export const createGameSetupSlice: StateCreator<GameStore, [["zustand/immer", never]], [], GameSetupSlice> = (set) => ({
  setupState: initialSetupState,

  initSetup: (playerCount: number, playerNames: string[]) => {
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

      const nationBonus = NATIONS[player.nation].startingBonus;
      if (nationBonus.stackingLimitBonus) {
          player.stackingLimitBonus = nationBonus.stackingLimitBonus;
      }

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

          if (queue.length > 0) return;
          if (state.setupState.pendingInitialWonders?.[player.id]) return;

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

  placeInitialWonder: (playerIndex: number, position: Position) => {
      set((state) => {
          const player = state.players[playerIndex];
          const wonderType = state.setupState.pendingInitialWonders?.[player.id];
          if (!wonderType) return;

          const tile = state.map.tiles[position.y][position.x];

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

          tile.wonder = { type: wonderType as any };
          tile.ownerId = player.id; 

          const capital = player.cities.find(c => c.isCapital);
          if (capital) {
              if (!capital.builtWonders) capital.builtWonders = [];
              capital.builtWonders.push(wonderType as any);
          }
          if (!player.builtWonders) player.builtWonders = [];
          player.builtWonders.push(wonderType as any);

          if (state.setupState.pendingInitialWonders) {
              delete state.setupState.pendingInitialWonders[player.id];
          }

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

      state.players.forEach(player => {
          const nationDef = NATIONS[player.nation as keyof typeof NATIONS];
          if (!nationDef) return;

          const bonus = nationDef.startingBonus;

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

          if (bonus.startingGovernment) {
              player.government = bonus.startingGovernment as any;
          }

          if (bonus.greatPeople) {
              player.greatPeople += bonus.greatPeople;
              if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
              for(let i = 0; i < bonus.greatPeople; i++) {
                  player.unplacedGreatPeople.push(drawRandomGreatPerson());
              }
          }

          if (bonus.armyCards) {
              bonus.armyCards.forEach(ac => {
                  for (let i = 0; i < ac.count; i++) {
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
                          statProfile: stats.profile
                      });
                  }
              });
          }

          if (bonus.stackingLimitBonus) {
              player.stackingLimitBonus = bonus.stackingLimitBonus;
          }

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