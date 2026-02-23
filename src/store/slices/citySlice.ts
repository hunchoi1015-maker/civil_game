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
  //setProduction: (cityId: string, itemType: string, itemId: string) => void;
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => void;
  produceArmyCard: (playerId: string, ype: string, tier: number, attack: number, health: number, name: string, cityId: string) => void;
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

  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => {
    set((state) => {
        const player = state.players[state.currentPlayerIndex];
        const city = player.cities.find(c => c.id === cityId);
        
        if (!city || city.hasActedThisTurn) return;

        const wonderDef = WONDERS[wonderType];
        if (!wonderDef) return;

        // 1. 기술 할인 적용
        let actualCost = wonderDef.cost;
        if (wonderDef.costReductionTech && player.technologies.some(t => t.id === wonderDef.costReductionTech)) {
            actualCost = Math.max(1, actualCost - wonderDef.costReductionAmount!);
        }

        // 🌟 2. 글로벌 자원(player.resources.production)이 아니라, 도시의 1턴 생산력을 검사!
        const cityProduction = calculateCityProduction(city, state.map);
        if (cityProduction < actualCost) return;

        // 타일 유효성 검사 
        const tile = state.map.tiles[tilePos.y][tilePos.x];
        if (tile.terrain === 'water') return;
        if (tile.buildingType || tile.cityId || tile.wonder) return;

        const dx = Math.abs(city.position.x - tilePos.x);
        const dy = Math.abs(city.position.y - tilePos.y);
        if (dx > 1 || dy > 1) return;

        // 🌟 3. 자원 차감 코드 삭제! 대신 도시 행동력을 소모합니다.
        // player.resources.production -= actualCost; <-- 이 코드가 있었다면 지워주세요!
        
        tile.wonder = { type: wonderType };
        tile.ownerId = player.id; 
        
        city.hasActedThisTurn = true; // 🌟 턴 소모

        if (!city.builtWonders) city.builtWonders = [];
        city.builtWonders.push(wonderType);

        if (!player.builtWonders) player.builtWonders = [];
        player.builtWonders.push(wonderType);

        if (!state.combatState.log) state.combatState.log = [];
        state.combatState.log.push({ message: `🏛️ ${player.name}이(가) ${city.name} 근처에 [${wonderDef.name}]을(를) 건설했습니다!` });
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
  produceArmyCard: (playerId: string, type: string, tier: number, attack: number, health: number, name: string, cityId: string) => {
    set((state) => {
      // 1. 플레이어와 도시 찾기
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      
      const city = player.cities.find(c => c.id === cityId);
      if (!city) return;

      // 2. 방어 코드 (이미 행동했는지 한 번 더 체크)
      if (city.hasActedThisTurn) {
        // 이미 UI에서 막았겠지만, 스토어 단에서도 한 번 더 안전하게 막아줍니다.
        return; 
      }

      // 3. 새로운 부대 카드 데이터 생성
      const newArmyCard = {
        id: crypto.randomUUID(),
        type: type as any,
        tier: tier as 1|2|3|4,
        attack,
        health,
        maxHealth: health,     
        ownerId: playerId,     
        isDeployed: false,  
        name,
        // isUsed: false (만약 타입에 isUsed가 없다고 에러가 나면 이 줄은 지워주세요!)
      };

      // 4. 플레이어 인벤토리에 카드 추가
      if (!player.armyCards) {
          player.armyCards = [];
      }
      player.armyCards.push(newArmyCard);

      // 5. 도시 행동 완료 처리
      city.hasActedThisTurn = true;
      
      // (참고) 만약 생산력 수치를 깎아야 한다면 상수 파일(ARMY_CARD_TEMPLATES)을 불러와서
      // city.currentProduction 등을 깎는 로직을 여기에 한 줄 추가하시면 됩니다.
      // 현재 UI 코드에서 검증(selectedCityProduction < selectedArmyTemplate.productionCost)을 
      // 먼저 하고 있으므로, 행동력 소진만으로도 정상 동작할 것입니다.
    });
  },
  
});