import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, createCity, createInitialLuxuryResources } from '../../types';
import { BUILDINGS } from '../../constants/buildings';
import { calculateCityProduction, calculateCityCulture } from '../../engine/ResourceCalculator';
import { findPlayerById } from '../helpers/playerHelpers';
import { setAdjacentTilesOwner } from '../helpers/mapHelpers';
import { ResourceType } from '../../types/map';
import { WonderType, WONDERS } from '../../types/wonder';

export interface CitySlice {
  foundCity: (playerId: string, position: Position, name: string) => void;
  buildInCity: (cityId: string, buildingType: string, position?: Position) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  harvestResource: (playerId: string, cityId: string, targetResource: ResourceType) => void;
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => void;
  // 🌟 [수정] 파라미터 마지막에 cost: number 추가
  produceArmyCard: (playerId: string, type: string, tier: number, attack: number, health: number, name: string, cityId: string, cost: number) => void;
  placeGreatPerson: (playerId: string, gpId: string, x: number, y: number) => void;
}

export const createCitySlice: StateCreator<GameStore, [["zustand/immer", never]], [], CitySlice> = (set) => ({
  foundCity: (playerId: string, position: Position, name: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      
      // 🌟 [신규] 관개(irrigation) 기술 보유 여부에 따른 최대 도시 수 동적 계산
      const hasIrrigation = player.technologies.some(tech => tech.id === 'irrigation');
      const maxCitiesLimit = hasIrrigation ? 3 : 2;

      if (player.cities.length >= maxCitiesLimit) return;
      
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
          
          // 🌟 1. 행동 충돌 방지: 수확을 이미 했다면 생산 불가
          if (city.actionTypeThisTurn === 'harvest') return;

          // 🌟 2. 공학 능력 및 횟수 한도 체크
          const hasEngineering = player.technologies.some(t => t.id === 'engineering');
          const currentProduced = city.producedItemsCount || 0;
          
          // 이미 1개 생산했는데 공학이 없거나 다른 도시가 공학을 썼다면 차단
          if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
          // 이미 2개를 생산했다면 무조건 차단
          if (currentProduced >= 2) return;

          // 🌟 3. 잔여 생산력 계산 및 차감
          const totalCityProduction = calculateCityProduction(city, state.map);
          const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
          
          if (availableProduction < buildingDef.productionCost) return;
          
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

          // 건물을 지을 타일에 이미 위인이 있다면 대기열로 돌려보냄!
          if (position) {
              const targetTile = state.map.tiles[position.y]?.[position.x];
              if (targetTile?.greatPerson) {
                  if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
                  player.unplacedGreatPeople.push(targetTile.greatPerson);
                  player.resources.currency = Math.max(0, player.resources.currency - targetTile.greatPerson.stats.currency);
                  targetTile.greatPerson = undefined;
              }
          }

          const buildingId = uuidv4();
          city.buildings.push({
            id: buildingId,
            type: buildingType as any,
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
          
          // 🌟 4. 상태 업데이트
          city.usedProductionThisTurn = (city.usedProductionThisTurn || 0) + buildingDef.productionCost;
          city.producedItemsCount = (city.producedItemsCount || 0) + 1;
          city.actionTypeThisTurn = 'produce';
          
          // 두 번째 물품을 생산했다면 공학 능력을 소모한 것으로 처리
          if (city.producedItemsCount === 2) {
            player.hasUsedEngineeringThisTurn = true;
          }
          city.hasActedThisTurn = true; // 기존 호환성을 위해 true 유지
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
      
      if (!city || city.hasHarvestedCulture) return;

      // 🌟 [추가] 행동 충돌 방지: 이번 턴에 생산을 했다면 수확 불가
      if (city.actionTypeThisTurn === 'produce' || (city.producedItemsCount || 0) > 0) return;
      
      let totalCulture = calculateCityCulture(city, state.map) + 1;
      
      if (city.isCapital) {
          if (player.government === 'monarchy') {
              totalCulture += 1; // 군주제 수도 보너스
          } else if (player.government === 'communism') {
              totalCulture -= 1; // 공산주의 수도 페널티
          }
      }
      
      if (totalCulture > 0) {
        player.resources.culture = Math.min(player.resources.culture + totalCulture, 50);
        
        city.hasHarvestedCulture = true; 
        // 🌟 [추가] 수확 행동 타입 확정
        city.actionTypeThisTurn = 'harvest';
        city.hasActedThisTurn = true;

        if (!state.combatState.log) state.combatState.log = [];
        state.combatState.log.push({ message: `🎭 ${player.name}이(가) ${city.name}에서 문화 ${totalCulture}을(를) 수확했습니다!` });
      } else {
        alert("수확할 문화가 없습니다.");
      }
    });
  },

  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => {
    set((state) => {
        const player = state.players[state.currentPlayerIndex];
        const city = player.cities.find(c => c.id === cityId);
        
        if (!city) return;

        const wonderDef = WONDERS[wonderType];
        if (!wonderDef) return;

        // 🌟 1. 행동 충돌 방지: 수확을 이미 했다면 생산 불가
        if (city.actionTypeThisTurn === 'harvest') return;

        // 🌟 2. 공학 능력 및 횟수 한도 체크
        const currentProduced = city.producedItemsCount || 0;
        const hasEngineering = player.technologies.some(t => t.id === 'engineering');
        if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
        if (currentProduced >= 2) return;

        // 기술 할인 적용
        let actualCost = wonderDef.cost;
        if (wonderDef.costReductionTech && player.technologies.some(t => t.id === wonderDef.costReductionTech)) {
            actualCost = Math.max(1, actualCost - wonderDef.costReductionAmount!);
        }

        // 🌟 3. 잔여 생산력 검사
        const totalCityProduction = calculateCityProduction(city, state.map);
        const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
        if (availableProduction < actualCost) return;

        // 타일 유효성 검사 
        const tile = state.map.tiles[tilePos.y][tilePos.x];
        if (tile.terrain === 'water') return;
        if (tile.buildingType || tile.cityId || tile.wonder) return;

        const dx = Math.abs(city.position.x - tilePos.x);
        const dy = Math.abs(city.position.y - tilePos.y);
        if (dx > 1 || dy > 1) return;
        
        // 불가사의를 지을 타일에 이미 위인이 있다면 대기열로 돌려보냄!
        if (tile.greatPerson) {
            if (!player.unplacedGreatPeople) player.unplacedGreatPeople = []; 
            player.unplacedGreatPeople.push(tile.greatPerson);
            tile.greatPerson = undefined;
        }
        
        tile.wonder = { type: wonderType };
        tile.ownerId = player.id; 
        
        if (!city.builtWonders) city.builtWonders = [];
        city.builtWonders.push(wonderType);

        if (!player.builtWonders) player.builtWonders = [];
        player.builtWonders.push(wonderType);

        // 🌟 4. 상태 업데이트
        city.usedProductionThisTurn = (city.usedProductionThisTurn || 0) + actualCost;
        city.producedItemsCount = (city.producedItemsCount || 0) + 1;
        city.actionTypeThisTurn = 'produce';
        if (city.producedItemsCount === 2) {
            player.hasUsedEngineeringThisTurn = true;
        }
        city.hasActedThisTurn = true;

        if (!state.combatState.log) state.combatState.log = [];
        state.combatState.log.push({ message: `🏛️ ${player.name}이(가) ${city.name} 근처에 [${wonderDef.name}]을(를) 건설했습니다!` });
    });
  },

  harvestResource: (playerId, cityId, targetResource) => {
    set((state) => {
      if (targetResource === 'none') return;
      if (state.currentPhase !== 'cityManagement') return;

      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;

      const city = player.cities.find((c) => c.id === cityId);
      if (!city) return;

      if (city.hasActedThisTurn && city.actionTypeThisTurn !== 'none') return;

      // 🌟 [추가] 생산을 했다면 수확 불가
      if (city.actionTypeThisTurn === 'produce' || (city.producedItemsCount || 0) > 0) return;

      // 도시 주변 9칸(중심+8방향) 탐색
      let resourceFound = false;
      const cx = city.position.x;
      const cy = city.position.y;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
            const tile = state.map.tiles[ny][nx];
            if (tile.resource === targetResource) {
              resourceFound = true;
              break; 
            }
          }
        }
        if (resourceFound) break;
      }

      if (!resourceFound) return;

      if (!player.luxuryResources) {
        player.luxuryResources = createInitialLuxuryResources();
      }

      // 자원 획득
      if (player.luxuryResources[targetResource] !== undefined) {
        player.luxuryResources[targetResource] += 1;
        
        // 🌟 [추가] 수확 상태 업데이트
        city.actionTypeThisTurn = 'harvest';
        city.hasActedThisTurn = true;
      }
    });
  },

  // 🌟 파라미터에 cost: number 추가됨
  produceArmyCard: (playerId: string, type: string, tier: number, attack: number, health: number, name: string, cityId: string, cost: number) => {
    set((state) => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      
      const city = player.cities.find(c => c.id === cityId);
      if (!city) return;

      // 🌟 1. 행동 충돌 방지
      if (city.actionTypeThisTurn === 'harvest') return;

      // 🌟 2. 공학 능력 및 횟수 한도 체크
      const currentProduced = city.producedItemsCount || 0;
      const hasEngineering = player.technologies.some(t => t.id === 'engineering');
      if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
      if (currentProduced >= 2) return;

      // 🌟 3. 잔여 생산력 검사 (파라미터로 받은 cost 사용)
      const totalCityProduction = calculateCityProduction(city, state.map);
      const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
      if (availableProduction < cost) return;

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
      };

      if (!player.armyCards) {
          player.armyCards = [];
      }
      player.armyCards.push(newArmyCard);

      // 🌟 4. 상태 업데이트
      city.usedProductionThisTurn = (city.usedProductionThisTurn || 0) + cost;
      city.producedItemsCount = (city.producedItemsCount || 0) + 1;
      city.actionTypeThisTurn = 'produce';
      if (city.producedItemsCount === 2) {
          player.hasUsedEngineeringThisTurn = true;
      }
      city.hasActedThisTurn = true;
    });
  },

  placeGreatPerson: (playerId: string, gpId: string, x: number, y: number) => {
    set((state) => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const gpIndex = (player.unplacedGreatPeople || []).findIndex(g => g.id === gpId);
      if (gpIndex === -1) return;
      const gp = player.unplacedGreatPeople[gpIndex];

      if (y < 0 || y >= state.map.height || x < 0 || x >= state.map.width) return;
      const tile = state.map.tiles[y][x];

      if (tile.cityId || tile.terrain === 'water') {
        alert("이 지형에는 위인을 배치할 수 없습니다.");
        return;
      }

      player.unplacedGreatPeople.splice(gpIndex, 1);

      if (tile.buildingType && tile.ownerId) {
        const owner = state.players.find(p => p.id === tile.ownerId);
        if (owner) {
          owner.cities.forEach(city => {
            city.buildings = city.buildings.filter(b => b.tilePosition?.x !== x || b.tilePosition?.y !== y);
          });
        }
        tile.buildingType = null;
      }

      if (tile.wonder) {
          alert("불가사의가 있는 타일에는 위인을 배치할 수 없습니다.");
          player.unplacedGreatPeople.push(gp);
          return;
      }

      tile.ownerId = playerId;
      tile.greatPerson = gp;

      if (gp.stats.currency > 0) {
          player.resources.currency = Math.min(15, player.resources.currency + gp.stats.currency);
      }

      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `🌟 ${player.name}이(가) ${gp.type} 위인을 맵에 배치했습니다! ${gp.description}` });
    });
  },
});