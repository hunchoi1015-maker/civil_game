import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, createCity } from '../../types';
import { BUILDINGS } from '../../constants/buildings';
import { calculateCityProduction, calculateCityCulture } from '../../engine/ResourceCalculator';
import { findPlayerById } from '../helpers/playerHelpers';
import { setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { createInitialLuxuryResources } from '../../types/player';

export interface CitySlice {
  foundCity: (playerId: string, position: Position, name: string) => void;
  buildInCity: (cityId: string, buildingType: string, position?: Position) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  harvestResource: (playerId: string, cityId: string) => void;
  setProduction: (cityId: string, itemType: string, itemId: string) => void;
}

export const createCitySlice: StateCreator<GameStore, [["zustand/immer", never]], [], CitySlice> = (set) => ({
  foundCity: (playerId: string, position: Position, name: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      if (player.cities.length >= 3) return;
      
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
      
      const cityId = uuidv4();
      const city = createCity(cityId, name, playerId, position, false);
      player.cities.push(city);
      state.map.tiles[position.y][position.x].cityId = cityId;
      state.map.tiles[position.y][position.x].ownerId = playerId;
      setAdjacentTilesOwner(state.map, position, playerId);
    });
  },

  buildInCity: (cityId: string, buildingType: string, position?: Position) => {
    set((state) => {
      for (const player of state.players) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city) {
          const buildingDef = BUILDINGS[buildingType as keyof typeof BUILDINGS];
          if (!buildingDef) return;
          if (city.hasActedThisTurn) return;
          
          const cityProduction = calculateCityProduction(city, state.map);
          if (cityProduction < buildingDef.productionCost) return;
          
          const existingCount = city.buildings.filter((b) => b.type === buildingType).length;
          if (buildingDef.maxPerCity && existingCount >= buildingDef.maxPerCity) return;
          if (city.buildings.some((b) => b.type === buildingType)) return;

          // 지형 제한 체크
          if (buildingDef.allowedTerrain) {
            if (buildingDef.allowedTerrain.includes('city')) {
              if (position && (position.x !== city.position.x || position.y !== city.position.y)) return;
            } else if (position) {
              const targetTile = state.map.tiles[position.y]?.[position.x];
              if (targetTile && !buildingDef.allowedTerrain.includes(targetTile.terrain)) return;
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
      const player = findPlayerById(state.players, playerId);
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
  harvestResource: (playerId, cityId) => {
    set((state) => {
      // 1. 단계 확인
      if (state.currentPhase !== 'cityManagement') return;

      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;

      const city = player.cities.find((c) => c.id === cityId);
      if (!city) return;

      // 2. 행동력 확인 (생산, 건설과 공유)
      if (city.hasActedThisTurn) return;

      // 3. 타일 자원 확인
      const tile = state.map.tiles[city.position.y][city.position.x];
      if (tile.resource === 'none') return;

      // [수정] 안전장치: luxuryResources가 없으면 초기화 (구버전 데이터 호환)
      if (!player.luxuryResources) {
        player.luxuryResources = createInitialLuxuryResources();
      }

      // [수정] 자원 키가 유효한지 확인 후 증가
      if (player.luxuryResources[tile.resource] !== undefined) {
        player.luxuryResources[tile.resource] += 1;
        city.hasActedThisTurn = true;
      } else {
        console.warn(`Unknown resource type: ${tile.resource}`);
        // 만약 'gold' 같은 삭제된 자원이라면 여기서 처리 (예: 무시하거나 기본 자원으로 변환)
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
            cost: 5, // 기본값, 실제로는 정의된 비용 필요
          };
          city.productionProgress = 0;
          break;
        }
      }
    });
  },
});