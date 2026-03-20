// src/store/slices/citySlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { Position, createCity, createInitialLuxuryResources } from '../../types';
import { BUILDINGS } from '../../constants/buildings';
import { calculateDetailedCityProduction, calculateCityCulture } from '../../engine/ResourceCalculator';
import { findPlayerById, hasActiveWonder } from '../helpers/playerHelpers';
import { setAdjacentTilesOwner, isTileBlockedByEnemy } from '../helpers/mapHelpers';
import { ResourceType } from '../../types/map';
import { WonderType, WONDERS } from '../../types/wonder';
import { generateArmyStats } from '../helpers/armyHelpers';

export interface CitySlice {
  buildInCity: (cityId: string, buildingType: string, position?: Position, isFree?: boolean) => void;
  harvestCityCulture: (playerId: string, cityId: string) => void;
  harvestResource: (playerId: string, cityId: string, targetResource: ResourceType) => void;
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => void;
  produceArmyCard: (playerId: string, type: string, tier: number, name: string, cityId: string, cost: number) => void;
  placeGreatPerson: (playerId: string, gpId: string, x: number, y: number) => void;
}

export const createCitySlice: StateCreator<GameStore, [["zustand/immer", never]], [], CitySlice> = (set,get) => ({
  foundCity: (playerId: string, position: Position, name: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      
      const hasIrrigation = player.technologies.some(tech => tech.id === 'irrigation');
      const maxCitiesLimit = hasIrrigation ? 3 : 2;

      if (player.cities.length >= maxCitiesLimit) return;
      
      for (const p of state.players) {
        for (const city of p.cities) {
          const dx = Math.abs(city.position.x - position.x);
          const dy = Math.abs(city.position.y - position.y);
          if (Math.max(dx, dy) < 3) return;
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

  buildInCity: (cityId: string, buildingType: string, position?: Position, isFree?: boolean) => {
    set((state) => {
      for (const player of state.players) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city) {
          if (player.government === 'anarchy' && city.isCapital) return; 
          if (city.isParalyzed) return; 

          const buildingDef = BUILDINGS[buildingType as keyof typeof BUILDINGS];
          if (!buildingDef) return;
          
          if (city.actionTypeThisTurn === 'harvest') return;

          const hasEngineering = player.technologies.some(t => t.id === 'engineering');
          const currentProduced = city.producedItemsCount || 0;
          
          if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
          if (currentProduced >= 2) return;

          const totalCityProduction = calculateDetailedCityProduction(city, state.map, player).total; 
          const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
          
          // 🌟 [수정] 무료 건설(isFree)이 아닐 때만 생산력 부족을 검사합니다!
          if (!isFree && availableProduction < buildingDef.productionCost) return;

          // (특성화 건물 덮어쓰기 로직 - 기존과 동일하게 유지)
          if (buildingDef.isSpecialty) {
            const existingSpecialtyIndex = city.buildings.findIndex(b => BUILDINGS[b.type].isSpecialty);
            if (existingSpecialtyIndex !== -1) {
              const existingSpecialty = city.buildings[existingSpecialtyIndex];
              if (position && existingSpecialty.tilePosition && (position.x !== existingSpecialty.tilePosition.x || position.y !== existingSpecialty.tilePosition.y)) {
                get().addToast("도시 특성화 건물은 1도시에 1개만 존재할 수 있습니다. 기존 특성화 건물을 클릭하여 교체하세요.","warning");
                return;
              }
              if (existingSpecialty.tilePosition) {
                const tile = state.map.tiles[existingSpecialty.tilePosition.y]?.[existingSpecialty.tilePosition.x];
                if (tile && tile.buildingType === existingSpecialty.type) {
                  tile.buildingType = null;
                }
              }
              city.buildings.splice(existingSpecialtyIndex, 1);
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🏗️ 특성화 교체: ${city.name}의 기존 특성화 건물이 철거되고 새 건물로 교체됩니다!` });
            }
          }
          
          const existingCount = city.buildings.filter((b) => b.type === buildingType).length;
          if (buildingDef.maxPerCity && existingCount >= buildingDef.maxPerCity) return;

          if (buildingDef.allowedTerrain) {
            if (buildingDef.allowedTerrain.includes('city')) {
              if (position && (position.x !== city.position.x || position.y !== city.position.y)) return;
            } else if (position) {
              const targetTile = state.map.tiles[position.y]?.[position.x];
              if (targetTile && !buildingDef.allowedTerrain.includes(targetTile.terrain)) return;
            }
          }

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
          
          // 🌟 [수정] 이집트 무료 건설 처리: 생산력을 차감하지 않고 특성 사용 완료 처리
          if (isFree) {
            player.hasUsedEgyptFreeBuildingThisTurn = true;
            if (!state.combatState.log) state.combatState.log = [];
            state.combatState.log.push({ message: `🏺 [이집트 특성] ${city.name}에 ${buildingDef.name}을(를) 무료로 건설했습니다!` });
          } else {
            // 일반 건설일 때만 생산력 차감
            city.usedProductionThisTurn = (city.usedProductionThisTurn || 0) + buildingDef.productionCost;
          }
          
          city.producedItemsCount = (city.producedItemsCount || 0) + 1;
          city.actionTypeThisTurn = 'produce';
          
          if (city.producedItemsCount === 2) {
            player.hasUsedEngineeringThisTurn = true;
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
      
      if (!city || city.hasHarvestedCulture) return;

      // 🌟 무정부 및 마비 검사
      if (player.government === 'anarchy' && city.isCapital) return; 
      if (city.isParalyzed) return; 

      if (city.actionTypeThisTurn === 'produce' || (city.producedItemsCount || 0) > 0) return;
      
      let totalCulture = calculateCityCulture(city, state.map, state.players) + 1;
      
      if (city.isCapital) {
          if (player.government === 'monarchy') {
              totalCulture += 1; 
          } else if (player.government === 'communism') {
              totalCulture -= 1; 
          }
      }
      
      if (totalCulture > 0) {
        player.resources.culture = Math.min(player.resources.culture + totalCulture, 50);
        
        city.hasHarvestedCulture = true; 
        city.actionTypeThisTurn = 'harvest';
        city.hasActedThisTurn = true;

        if (!state.combatState.log) state.combatState.log = [];
        state.combatState.log.push({ message: `🎭 ${player.name}이(가) ${city.name}에서 문화 ${totalCulture}을(를) 수확했습니다!` });
      } else {
        get().addToast("수확할 문화가 없습니다.","error");
      }
    });
  },

  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => {
    set((state) => {
        const player = state.players[state.currentPlayerIndex];
        const city = player.cities.find(c => c.id === cityId);
        if (!city) return;

        // 🌟 무정부 및 마비 검사
        if (player.government === 'anarchy' && city.isCapital) return; 
        if (city.isParalyzed) return; 

        const wonderDef = WONDERS[wonderType];
        if (!wonderDef) return;

        let isAlreadyBuilt = false;
        for (const p of state.players) {
            if (p.builtWonders && p.builtWonders.includes(wonderType)) {
                isAlreadyBuilt = true;
                break;
            }
        }
        if (isAlreadyBuilt) {
            get().addToast("이 불가사의는 이미 건설되었거나 역사 속으로 사라졌습니다.","error");
            return;
        }

        if (city.actionTypeThisTurn === 'harvest') return;

        const currentProduced = city.producedItemsCount || 0;
        const hasEngineering = player.technologies.some(t => t.id === 'engineering');
        if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
        if (currentProduced >= 2) return;

        let actualCost = wonderDef.cost;
        if (wonderDef.costReductionTech && player.technologies.some(t => t.id === wonderDef.costReductionTech)) {
            actualCost = Math.max(1, actualCost - wonderDef.costReductionAmount!);
        }

        const totalCityProduction = calculateDetailedCityProduction(city, state.map, player).total; 
        const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
        if (availableProduction < actualCost) return;

        const tile = state.map.tiles[tilePos.y][tilePos.x];
        if (tile.terrain === 'water') return;

        const dx = Math.abs(city.position.x - tilePos.x);
        const dy = Math.abs(city.position.y - tilePos.y);
        if (dx > 1 || dy > 1) return;
        
        if (tile.greatPerson) {
            if (!player.unplacedGreatPeople) player.unplacedGreatPeople = []; 
            player.unplacedGreatPeople.push(tile.greatPerson);
            tile.greatPerson = undefined;
        }
        
        // 🌟 [덮어쓰기 파괴 로직]
        if (tile.buildingType) {
            city.buildings = city.buildings.filter(b => b.tilePosition?.x !== tilePos.x || b.tilePosition?.y !== tilePos.y);
            tile.buildingType = null;
            if (!state.combatState.log) state.combatState.log = [];
            state.combatState.log.push({ message: `💥 불가사의 건설을 위해 기존 건물이 철거되었습니다.` });
        }

        if (tile.wonder) {
            const oldWonder = tile.wonder.type;
            city.builtWonders = city.builtWonders?.filter(w => w !== oldWonder);
            player.builtWonders = player.builtWonders?.filter(w => w !== oldWonder);
            if (!state.combatState.log) state.combatState.log = [];
            state.combatState.log.push({ message: `💥 새로운 불가사의 배치로 기존 불가사의(${oldWonder})가 역사 속으로 소실되었습니다!` });
        }

        tile.wonder = { type: wonderType };
        tile.ownerId = player.id; 
        
        if (!city.builtWonders) city.builtWonders = [];
        city.builtWonders.push(wonderType);

        if (!player.builtWonders) player.builtWonders = [];
        player.builtWonders.push(wonderType);

        city.usedProductionThisTurn = (city.usedProductionThisTurn || 0) + actualCost;
        city.producedItemsCount = (city.producedItemsCount || 0) + 1;
        city.actionTypeThisTurn = 'produce';
        if (city.producedItemsCount === 2) {
            player.hasUsedEngineeringThisTurn = true;
        }
        city.hasActedThisTurn = true;

        if (!state.combatState.log) state.combatState.log = [];
        state.combatState.log.push({ message: `🏛️ ${player.name}이(가) ${city.name}에 [${wonderDef.name}]을(를) 건설했습니다!` });
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

      // 🌟 무정부 및 마비 검사
      if (player.government === 'anarchy' && city.isCapital) return; 
      if (city.isParalyzed) return; 

      if (city.hasActedThisTurn && city.actionTypeThisTurn !== 'none') return;
      if (city.actionTypeThisTurn === 'produce' || (city.producedItemsCount || 0) > 0) return;

      let resourceFound = false;
      const cx = city.position.x;
      const cy = city.position.y;

      if (city.pioneerLinkedLuxuries && city.pioneerLinkedLuxuries.includes(targetResource)) {
        resourceFound = true;
      } else {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
              const tile = state.map.tiles[ny][nx];
              if (tile.resource === targetResource) {
                if (!isTileBlockedByEnemy(state.players, player.id, nx, ny)) {
                  resourceFound = true;
                  break; 
                }
              }
            }
          }
          if (resourceFound) break;
        }
      }

      if (!resourceFound && city.pioneerLinkedLuxuries?.includes(targetResource)) {
          resourceFound = true;
      }

      if (!resourceFound) return;

      if (!player.luxuryResources) {
        player.luxuryResources = createInitialLuxuryResources();
      }

      const hasAngkorWat = hasActiveWonder(player.id, 'angkor_wat', state.map, state.players);
      const canUseAngkorWat = hasAngkorWat && !player.hasUsedAngkorWatThisTurn;
      const requestedAmount = canUseAngkorWat ? 2 : 1;
      const actualAmount = Math.min(requestedAmount, state.marketResources[targetResource]);

      if (actualAmount === 0) {
          get().addToast(`시장에 [${targetResource}] 재고가 고갈되어 수확할 수 없습니다!`,"warning");
          return;
      }

      state.marketResources[targetResource] -= actualAmount; 
      player.luxuryResources[targetResource] += actualAmount; 
      
      if (canUseAngkorWat && actualAmount > 1) {
          player.hasUsedAngkorWatThisTurn = true;
          if (!state.combatState.log) state.combatState.log = [];
          state.combatState.log.push({ message: `🌿 [앙코르와트] ${player.name}이(가) ${targetResource} 2개를 수확했습니다!` });
      }

      city.actionTypeThisTurn = 'harvest';
      city.hasActedThisTurn = true;
    });
  },

  produceArmyCard: (playerId: string, type: string, tier: number, name: string, cityId: string, cost: number) => {
    set((state) => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;
      
      const city = player.cities.find(c => c.id === cityId);
      if (!city) return;

      // 🌟 무정부 및 마비 검사
      if (player.government === 'anarchy' && city.isCapital) return; 
      if (city.isParalyzed) return; 

      if (city.actionTypeThisTurn === 'harvest') return;

      const currentProduced = city.producedItemsCount || 0;
      const hasEngineering = player.technologies.some(t => t.id === 'engineering');
      if (currentProduced === 1 && (!hasEngineering || player.hasUsedEngineeringThisTurn)) return;
      if (currentProduced >= 2) return;

      const totalCityProduction = calculateDetailedCityProduction(city, state.map, player).total; 
      const availableProduction = totalCityProduction - (city.usedProductionThisTurn || 0);
      if (availableProduction < cost) return;

      // 🌟 부대 랜덤 스탯 부여
      const stats = generateArmyStats(tier);

      const newArmyCard = {
        id: uuidv4(),
        type: type as any,
        tier: tier as 1|2|3|4,
        attack: stats.attack,
        health: stats.maxHealth,
        maxHealth: stats.maxHealth,     
        ownerId: playerId,     
        isDeployed: false,  
        name,
        statProfile: stats.profile
      };

      if (!player.armyCards) player.armyCards = [];
      player.armyCards.push(newArmyCard);

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
      // ... 기존 로직 동일 (생략 없이 원본 유지 필요하나 지면상 생략, 원본 그대로 두시면 됩니다.)
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const gpIndex = (player.unplacedGreatPeople || []).findIndex(g => g.id === gpId);
      if (gpIndex === -1) return;
      const gp = player.unplacedGreatPeople[gpIndex];

      if (y < 0 || y >= state.map.height || x < 0 || x >= state.map.width) return;
      const tile = state.map.tiles[y][x];

      if (tile.cityId || tile.terrain === 'water') {
        get().addToast("이 지형에는 위인을 배치할 수 없습니다.","warning");
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
          get().addToast("불가사의가 있는 타일에는 위인을 배치할 수 없습니다.","warning");
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