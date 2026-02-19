import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, createCity, createInitialLuxuryResources } from '../../types'; // [필수] createInitialLuxuryResources 확인
import { BUILDINGS } from '../../constants/buildings';
import { calculateCityProduction, calculateCityCulture } from '../../engine/ResourceCalculator';
import { findPlayerById } from '../helpers/playerHelpers';
import { setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { ResourceType } from '../../types/map'; // ResourceType 추가
import { WonderType, WONDERS } from '../../types/wonder';


export interface CitySlice {
  foundCity: (playerId: string, position: Position, name: string) => void;
  buildInCity: (cityId: string, buildingType: string, position?: Position) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  // [수정] 자원 타입을 인자로 받도록 변경
  harvestResource: (playerId: string, cityId: string, targetResource: ResourceType) => void;
  setProduction: (cityId: string, itemType: string, itemId: string) => void;
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => void;
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
        // [수정된 부분] 트랙(cultureTrack)이 아니라 보유 자원(resources.culture)을 증가
        // 최대 한도인 50까지만 저장되도록 Math.min 적용
        player.resources.culture = Math.min(player.resources.culture + cityCulture, 50);
        city.hasActedThisTurn = true;
      }
    });
  },

  // [신규] 불가사의 건설 (즉시 배치)
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => {
    set((state) => {
        const player = state.players[state.currentPlayerIndex];
        const city = player.cities.find(c => c.id === cityId);
        if (!city) return;
        
        const wonderDef = WONDERS[wonderType];
        if (player.resources.production < wonderDef.cost) return; // 비용 체크

        // 타일 유효성 검사
        const tile = state.map.tiles[tilePos.y][tilePos.x];
        
        // 1. 물 타일 불가
        if (tile.terrain === 'water') return;
        
        // 2. 이미 건물/불가사의/도시가 있는 경우 불가
        if (tile.buildingType || tile.cityId || tile.wonder) return;

        // 3. 도시 주변 8칸 이내 (거리 1)
        const dx = Math.abs(city.position.x - tilePos.x);
        const dy = Math.abs(city.position.y - tilePos.y);
        if (dx > 1 || dy > 1) return;

        // 건설 실행
        player.resources.production -= wonderDef.cost;
        tile.wonder = { type: wonderType };
        tile.ownerId = player.id; // 불가사의 타일 소유권 확실히
    });
  },

  // [수정] 주변 8칸 탐색 및 선택된 자원 수확 로직 적용
  harvestResource: (playerId, cityId, targetResource) => {
    set((state) => {
      if (targetResource === 'none') return;
      if (state.currentPhase !== 'cityManagement') return;

      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;

      const city = player.cities.find((c) => c.id === cityId);
      if (!city) return;

      if (city.hasActedThisTurn) return;

      // 도시 주변 9칸(중심+8방향) 탐색
      let resourceFound = false;
      const cx = city.position.x;
      const cy = city.position.y;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          // 맵 범위 체크
          if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
            const tile = state.map.tiles[ny][nx];
            // 요청한 자원이 있는지 확인
            if (tile.resource === targetResource) {
              resourceFound = true;
              break; 
            }
          }
        }
        if (resourceFound) break;
      }

      // 자원이 없으면 중단
      if (!resourceFound) return;

      // 인벤토리 안전장치
      if (!player.luxuryResources) {
        player.luxuryResources = createInitialLuxuryResources();
      }

      // 자원 획득
      if (player.luxuryResources[targetResource] !== undefined) {
        player.luxuryResources[targetResource] += 1;
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
            cost: 5, // 기본값, 실제로는 정의된 비용 필요
          };
          city.productionProgress = 0;
          break;
        }
      }
    });
  },
});