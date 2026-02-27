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
  harvestResource: (playerId: string, cityId: string, targetResource: ResourceType) => void;
  constructWonder: (cityId: string, wonderType: WonderType, tilePos: Position) => void;
  produceArmyCard: (playerId: string, ype: string, tier: number, attack: number, health: number, name: string, cityId: string) => void;
  placeGreatPerson: (playerId: string, gpId: string, x: number, y: number) => void;
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

          // 건물을 지을 타일에 이미 위인이 있다면 대기열로 돌려보냄!
          if (position) {
              const targetTile = state.map.tiles[position.y]?.[position.x];
              if (targetTile?.greatPerson) {
                  if (!player.unplacedGreatPeople) player.unplacedGreatPeople = []; // 안전장치
                  player.unplacedGreatPeople.push(targetTile.greatPerson);
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
      
      if (!city || city.hasActedThisTurn || city.hasHarvestedCulture) return;
      
      // ==========================================
      // 🌟 [추가] 새로운 문화 수확 룰 적용!
      // ==========================================
      
      // 1. 기본적으로 무조건 +1 의 문화가 보장됩니다!
      let totalCulture = calculateCityCulture(city, state.map) + 1;
      
      // 2. '수도'에서 문화를 수확할 때만 체제별 보너스/페널티 적용!
      if (city.isCapital) {
          if (player.government === 'monarchy') {
              totalCulture += 1; // 군주제 수도 보너스
          } else if (player.government === 'communism') {
              totalCulture -= 1; // 공산주의 수도 페널티
          }
      }
      
      // ==========================================

      // 최종 수확량이 0보다 클 때만 더해줍니다.
      if (totalCulture > 0) {
        player.resources.culture = Math.min(player.resources.culture + totalCulture, 50);
        
        city.hasActedThisTurn = true;
        city.hasHarvestedCulture = true; 

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

        // 불가사의를 지을 타일에 이미 위인이 있다면 대기열로 돌려보냄!
        if (tile.greatPerson) {
            if (!player.unplacedGreatPeople) player.unplacedGreatPeople = []; // 안전장치
            player.unplacedGreatPeople.push(tile.greatPerson);
            tile.greatPerson = undefined;
        }
        
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

  // 위인을 타일에 배치하는 완벽한 로직!
  placeGreatPerson: (playerId: string, gpId: string, x: number, y: number) => {
    set((state) => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      // 1. 대기열에서 위인 찾기
      const gpIndex = (player.unplacedGreatPeople || []).findIndex(g => g.id === gpId);
      if (gpIndex === -1) return;
      const gp = player.unplacedGreatPeople[gpIndex];

      // 타일 유효성 검사
      if (y < 0 || y >= state.map.height || x < 0 || x >= state.map.width) return;
      const tile = state.map.tiles[y][x];

      // 도심부나 물, 산 위에는 위인을 둘 수 없음 (기획에 맞게 조절 가능)
      if (tile.cityId || tile.terrain === 'water' || tile.terrain === 'mountain') {
        alert("이 지형에는 위인을 배치할 수 없습니다.");
        return;
      }

      // 2. 대기열에서 빼기
      player.unplacedGreatPeople.splice(gpIndex, 1);

      // 3. 기존 건물이 있으면 무자비하게 파괴! 💥 (불가사의 제외)
      if (tile.buildingType && tile.ownerId) {
        const owner = state.players.find(p => p.id === tile.ownerId);
        if (owner) {
          owner.cities.forEach(city => {
            // 도시 건물 목록에서 해당 좌표의 건물을 찾아 아예 지워버림
            city.buildings = city.buildings.filter(b => b.tilePosition?.x !== x || b.tilePosition?.y !== y);
          });
        }
        tile.buildingType = null;
      }

      // 불가사의 파괴 로직이 필요하다면 여기에 추가 (현재는 건드리지 않음)
      if (tile.wonder) {
          alert("불가사의가 있는 타일에는 위인을 배치할 수 없습니다.");
          player.unplacedGreatPeople.push(gp); // 다시 복구
          return;
      }

      // 4. 타일 소유권 설정 (없다면) 및 위인 꽂기!
      tile.ownerId = playerId;
      tile.greatPerson = gp;

      // 로그 추가
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `🌟 ${player.name}이(가) ${gp.type} 위인을 맵에 배치했습니다! ${gp.description}` });
    });
  },
});