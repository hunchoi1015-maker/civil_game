// src/store/slices/techSlice.ts

import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { TECHNOLOGIES } from '../../constants/technologies';
import { Player } from '../../types/player';
import { PlayerTechnology } from '../../types/tech';
import { TECH_COSTS } from '../../types';
import { Position } from '../../types/map'; 
import { GOVERNMENTS } from '../../constants/governments';
import { ARMY_CARD_TEMPLATES } from '../../constants/armyCards';
// 🌟 [추가] 패시브(배치 한도 등)를 가져오기 위한 헬퍼 함수 임포트
import { getPlayerPassives } from '../helpers/playerHelpers';

// 🌟 [피라미드 검증 헬퍼 함수]
export function canResearchPyramid(player: Player, targetTechId: string): { canResearch: boolean, reason?: string } {
  const targetTechDef = TECHNOLOGIES.find(t => t.id === targetTechId);
  if (!targetTechDef) return { canResearch: false, reason: "존재하지 않는 기술입니다." };

  if (player.technologies.some(t => t.id === targetTechId)) {
    return { canResearch: false, reason: "이미 연구한 기술입니다." };
  }

  const getPyramidLevel = (techId: string) => {
    const def = TECHNOLOGIES.find(t => t.id === techId);
    if (!def) return 1;
    if (def.isStartingTechFor) return 1; 
    return def.level;
  };

  const targetPyramidLevel = getPyramidLevel(targetTechId);

  if (targetPyramidLevel === 1) return { canResearch: true };

  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach(tech => {
    const pLevel = getPyramidLevel(tech.id);
    levelCounts[pLevel] = (levelCounts[pLevel] || 0) + 1;
  });

  const requiredLowerTechCount = levelCounts[targetPyramidLevel - 1] || 0;
  const currentTargetLevelCount = levelCounts[targetPyramidLevel] || 0;

  if (requiredLowerTechCount > currentTargetLevelCount) {
    return { canResearch: true };
  } else {
    return { 
      canResearch: false, 
      reason: `피라미드 조건 부족: ${targetPyramidLevel}레벨 기술을 연구하려면 ${targetPyramidLevel - 1}레벨 기술이 더 필요합니다.` 
    };
  }
}

// 🌟 [스토어 슬라이스 정의]
export interface TechSlice {
  researchTech: (techId: string) => void;
  useTechResourceAbility: (techId: string, payload?: any) => void; 
  executeTechAbility: (playerId: string, techId: string, payload: any) => void; 
  turnResearchResults: { playerId: string; techId: string; techName: string }[];
  showResearchResults: boolean;
  setShowResearchResults: (show: boolean) => void;
  clearResearchResults: () => void;
  steamPowerSource: Position | null; 
  setSteamPowerSource: (pos: Position | null) => void; 
}

export const createTechSlice: StateCreator<GameStore, [["zustand/immer", never]], [], TechSlice> = (set, get) => ({
  turnResearchResults: [],
  showResearchResults: false,
  setShowResearchResults: (show) => set((state) => { state.showResearchResults = show; }),
  clearResearchResults: () => set((state) => { state.turnResearchResults = []; }),
  steamPowerSource: null,
  setSteamPowerSource: (pos) => set((state) => { state.steamPowerSource = pos; }),

  researchTech: (techId: string) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const techDef = TECHNOLOGIES.find(t => t.id === techId);
      if (!techDef) return;

      const check = canResearchPyramid(player, techId);
      if (!check.canResearch) {
          alert(check.reason);
          return;
      }
      const availableTrade = player.resources.trade - player.resources.currency;
      const cost = TECH_COSTS[techDef.level] || 0; 
      
      if (availableTrade < cost) {
          alert(`사용 가능한 교역 토큰이 부족합니다. (비용: ${cost}, 사용 가능: ${availableTrade})`);
          return;
      }
      player.resources.trade -= cost; 

      const newTech: PlayerTechnology = {
          ...techDef,
          tokensOnCard: 0,
          abilityUsedThisTurn: false
      };
      player.technologies.push(newTech);
    
      if (techDef.upgradesBuilding) {
          const fromBuilding = techDef.upgradesBuilding.from;
          const toBuilding = techDef.upgradesBuilding.to;
          
          let upgradedBankCount = 0; 

          player.cities.forEach(city => {
              city.buildings.forEach(building => {
                  if (building.type === fromBuilding) {
                      building.type = toBuilding as any;
                      if (toBuilding === 'bank') upgradedBankCount++;
                  }
              });
          });

          for (let y = 0; y < state.map.height; y++) {
              for (let x = 0; x < state.map.width; x++) {
                  const tile = state.map.tiles[y][x];
                  if (tile.ownerId === player.id && tile.buildingType === fromBuilding) {
                      tile.buildingType = toBuilding as any;
                  }
              }
          }

          if (upgradedBankCount > 0) {
              player.resources.currency = Math.min(player.resources.currency + upgradedBankCount, 15);
              if (state.combatState && !state.combatState.log) state.combatState.log = [];
              state.combatState?.log?.push({ 
                  message: `💰 금융 기술 연구로 ${upgradedBankCount}개의 시장이 은행으로 개량되어 화폐 ${upgradedBankCount}개를 획득했습니다!` 
              });
          }
      }

      const unlockedCards = ARMY_CARD_TEMPLATES.filter(c => c.requiredTech === techId);
      unlockedCards.forEach(newCard => {
          if (newCard.tier > 1) {
              if (player.armyCards) { 
                  player.armyCards.forEach(card => {
                      if (card.type === newCard.type && card.tier < newCard.tier) {
                          card.tier = newCard.tier;           
                          card.name = newCard.name;           
                          card.attack += 1;                   
                          card.health += 1;                   
                          card.maxHealth += 1;                
                      }
                  });
              }
          }
      });

      const unlockedGov = Object.values(GOVERNMENTS).find(g => g.requiredTech === techId);
      if (unlockedGov) {
          player.freeGovernmentSwitch = true;
      }

      const hasFlight = player.technologies.some(t => t.id === 'flight');
      const hasSteam = player.technologies.some(t => t.id === 'steam_power');
      const hasNavigation = player.technologies.some(t => t.id === 'navigation');
      const hasHorseback = player.technologies.some(t => t.id === 'horseback_riding');

      let maxMovement = 2; 
      if (hasFlight) maxMovement = 6;
      else if (hasSteam) maxMovement = 5;
      else if (hasNavigation) maxMovement = 4;
      else if (hasHorseback) maxMovement = 3;

      player.units.forEach((unit) => {
          unit.maxMovement = maxMovement;
           unit.movement = maxMovement; 
      });

      state.turnResearchResults.push({
          playerId: player.id,
          techId: techId,
          techName: techDef.name
      });

      if (techDef.upgradesUnit) {
          const fromUnit = techDef.upgradesUnit.from;
          const toUnit = techDef.upgradesUnit.to;
          
          player.units.forEach(unit => {
              if (unit.type === fromUnit) {
                  unit.type = toUnit as any;
              }
          });
      }
    });
  },

  useTechResourceAbility: (techId: string, payload?: any) => {
    let costPaid = false;

    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const tech = player.technologies.find(t => t.id === techId);
      
      if (!tech || !tech.resourceAbility || tech.abilityUsedThisTurn) return;

      switch (techId) {
        case 'pottery':
        case 'printing_press':
        case 'democracy':
          if (tech.tokensOnCard >= (tech.resourceAbility.maxTokens || 4)) {
              alert("이 기술 카드에 더 이상 화폐 토큰을 올릴 수 없습니다.");
              return;
          }
          if (techId === 'pottery' && payload?.consumedResources) {
              let total = 0;
              Object.entries(payload.consumedResources).forEach(([res, amount]) => {
                  const num = amount as number;
                  total += num;
                  if (res === 'spies') player.spies -= num;
                  else if (res === 'nuclearMaterial') player.nuclearMaterial -= num;
                  else player.luxuryResources[res as keyof typeof player.luxuryResources] -= num;
              });
              if (total < 2) { alert("자원이 부족합니다."); return; }
              costPaid = true;
          } else if (techId === 'printing_press') {
              if (player.resources.culture >= 5) { player.resources.culture -= 5; costPaid = true; } else { alert("문화 토큰이 부족합니다."); return; }
          } else if (techId === 'democracy') {
              if (player.resources.trade >= 6) { player.resources.trade -= 6; costPaid = true; } else { alert("교역 토큰이 부족합니다."); return; }
          }
          break;

        case 'writing':
        case 'communism':
          if (player.spies >= 1) { player.spies -= 1; costPaid = true; } else { alert("스파이가 부족합니다."); return; }
          break;

        case 'currency':
        case 'chivalry':
        case 'metallurgy':
          if (player.luxuryResources.spice >= 1) { player.luxuryResources.spice -= 1; costPaid = true; } else { alert("향료가 부족합니다."); return; }
          break;

        case 'animal_husbandry':
        case 'construction':
        case 'finance':
          if (player.luxuryResources.wheat >= 1) { player.luxuryResources.wheat -= 1; costPaid = true; } else { alert("밀이 부족합니다."); return; }
          break;

        // 🌟 [수정] 스팀파워 분리
        case 'horseback_riding':
        case 'monarchy':
          if (player.luxuryResources.silk >= 1) { player.luxuryResources.silk -= 1; costPaid = true; } else { alert("비단이 부족합니다."); return; }
          break;

        // 🌟 [신규] 스팀파워 전용 케이스 (도착지 한도 검사 포함)
        case 'steam_power':
          if (player.luxuryResources.silk >= 1 && state.steamPowerSource && payload?.x !== undefined && payload?.y !== undefined) {
              const targetTile = state.map.tiles[payload.y][payload.x];
              if (targetTile.terrain !== 'water') { 
                  alert("도착지는 반드시 물 타일이어야 합니다."); 
                  state.steamPowerSource = null;
                  return; 
              }
              
              const sourceUnits = player.units.filter(u => u.position.x === state.steamPowerSource!.x && u.position.y === state.steamPowerSource!.y);
              
              // 🌟 타일 배치 한도 검사!
              const passives = getPlayerPassives(player);
              const stackingLimit = 2 + passives.stackingLimitBonus;
              const myUnitsOnTarget = targetTile.unitIds.filter(id => player.units.some(u => u.id === id)).length;
              
              if (myUnitsOnTarget + sourceUnits.length > stackingLimit) {
                  alert(`도착지 타일의 배치 한도(${stackingLimit}개)가 초과되어 순간이동할 수 없습니다.`);
                  state.steamPowerSource = null;
                  return; // 발동 취소 (비단도 안 깎임)
              }

              player.luxuryResources.silk -= 1; 
              costPaid = true; 
          } else { 
              alert("비단이 부족하거나 출발지/도착지가 올바르지 않습니다."); 
              state.steamPowerSource = null; 
              return;
          }
          break;

        case 'gunpowder':
          if (payload?.consumedResources) {
              let total = 0;
              Object.entries(payload.consumedResources).forEach(([res, amount]) => {
                  const num = amount as number;
                  total += num;
                  if (res === 'spies') player.spies -= num;
                  else if (res === 'nuclearMaterial') player.nuclearMaterial -= num;
                  else player.luxuryResources[res as keyof typeof player.luxuryResources] -= num;
              });
              if (total < 2) { alert("자원이 부족합니다."); return; }
              costPaid = true;
          }
          break;

        case 'atomic_theory': 
          if (player.nuclearMaterial >= 1) {
              if (state.currentPhase === 'cityManagement' && tech.usedPhases?.includes('cityManagement')) { alert("이미 사용"); return; }
              if (state.currentPhase === 'movement' && tech.usedPhases?.includes('movement')) { alert("이미 사용"); return; }
              player.nuclearMaterial -= 1;
              if (!tech.usedPhases) tech.usedPhases = [];
              tech.usedPhases.push(state.currentPhase);
              costPaid = true;
          } else { alert("우라늄이 부족합니다."); return; }
          break;

        case 'philosophy':
            if (payload?.consumedResources) {
                let total = 0;
                Object.entries(payload.consumedResources).forEach(([res, amount]) => {
                    const num = amount as number;
                    total += num;
                    player.luxuryResources[res as keyof typeof player.luxuryResources] -= num;
                });
                if (total < 3) { alert("자원이 부족합니다."); return; }
                costPaid = true;
            }
            break;

        case 'metal_casting':
          costPaid = true;
          break;
      }

      if (costPaid) {
          if (techId !== 'atomic_theory') tech.abilityUsedThisTurn = true; 
          
          if (state.combatState && !state.combatState.log) state.combatState.log = [];
          state.combatState?.log?.push({ message: `⚙️ ${player.name}이(가) [${tech.name}] 능력을 선언했습니다! 자원 지불 완료. (개입 대기 중...)` });
      }
    });

    if (costPaid) {
        const state = get();
        get().pushActionToStack({
            id: Date.now().toString(),
            sourcePlayerId: state.players[state.currentPlayerIndex].id,
            actionType: 'resource_ability',
            payload: { techId, ...payload } 
        });
    }
  },

  executeTechAbility: (playerId: string, techId: string, payload: any) => {
    set((state) => {
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;
        const tech = player.technologies.find(t => t.id === techId);
        let success = false;

        switch (techId) {
            case 'pottery':
            case 'printing_press':
            case 'democracy':
                if (tech) tech.tokensOnCard += 1;
                player.resources.currency = Math.min(player.resources.currency + 1, 15);
                success = true; break;
            case 'philosophy':
                player.greatPeople += 1; success = true; break;
            case 'writing':
                const tcW = state.players.find(p => p.id === payload.targetPlayerId)?.cities.find(c => c.id === payload.targetCityId);
                if (tcW) { tcW.isParalyzed = true; success = true; } break;
            case 'communism':
                if (payload.x !== undefined && payload.y !== undefined) { state.map.tiles[payload.y][payload.x].isParalyzed = true; success = true; } break;
            case 'currency':
                player.resources.culture += 3; success = true; break;
            case 'chivalry':
                player.resources.culture += 5; success = true; break;
            case 'metallurgy':
                player.resources.culture += 7; success = true; break;
            case 'animal_husbandry':
                const cA = player.cities.find(c => c.id === payload.targetCityId); if (cA) { cA.tempProductionBonus = (cA.tempProductionBonus || 0) + 3; success = true; } break;
            case 'construction':
                const cC = player.cities.find(c => c.id === payload.targetCityId); if (cC) { cC.tempProductionBonus = (cC.tempProductionBonus || 0) + 5; success = true; } break;
            case 'finance':
                const cF = player.cities.find(c => c.id === payload.targetCityId); if (cF) { cF.tempProductionBonus = (cF.tempProductionBonus || 0) + 7; success = true; } break;
            case 'horseback_riding':
                const tpH = state.players.find(p => p.id === payload.targetPlayerId);
                if (tpH) { player.resources.trade = Math.min(27, player.resources.trade + 9); tpH.resources.trade = Math.min(27, tpH.resources.trade + 6); success = true; } break;
            case 'monarchy':
            case 'gunpowder':
                if (payload.targetType === 'wonder') {
                    const tp = state.players.find(p => p.id === payload.targetPlayerId);
                    if (tp) { tp.invalidatedWonders = tp.invalidatedWonders || []; tp.invalidatedWonders.push(payload.targetWonder); success = true; alert(`[불가사의 무효화 성공!]`); }
                } else if (payload.targetType === 'random_card' || payload.targetType === 'building') {
                    const tp = state.players.find(p => p.id === payload.targetPlayerId);
                    if (payload.targetType === 'random_card' && tp && tp.armyCards.length > 0) {
                        const dCard = tp.armyCards.splice(Math.floor(Math.random() * tp.armyCards.length), 1)[0]; success = true; alert(`[부대 파괴 성공: ${dCard.name}]`);
                    } else if (payload.targetType === 'building') {
                        const bIdx = tp?.cities.find(c => c.id === payload.targetCityId)?.buildings.findIndex(b => b.type === payload.targetBuilding);
                        if (bIdx !== undefined && bIdx !== -1) { tp!.cities.find(c => c.id === payload.targetCityId)!.buildings.splice(bIdx, 1); success = true; alert(`[건물 파괴 성공!]`); }
                    }
                } break;
            case 'steam_power':
                if (payload.x !== undefined && payload.y !== undefined && state.steamPowerSource) {
                    const sourceUnits = player.units.filter(u => u.position.x === state.steamPowerSource!.x && u.position.y === state.steamPowerSource!.y);
                    sourceUnits.forEach(u => {
                        state.map.tiles[u.position.y][u.position.x].unitIds = state.map.tiles[u.position.y][u.position.x].unitIds.filter(id => id !== u.id);
                        u.position = { x: payload.x, y: payload.y }; u.movement = 0; u.hasMoved = true;
                        if (!state.map.tiles[payload.y][payload.x].unitIds.includes(u.id)) state.map.tiles[payload.y][payload.x].unitIds.push(u.id);
                    });
                    success = true; state.steamPowerSource = null; alert(`[증기력] 유닛 순간이동 성공!`);
                } break;
            case 'atomic_theory':
                if (payload.x !== undefined && payload.y !== undefined) {
                    const tTile = state.map.tiles[payload.y][payload.x]; const tcId = tTile.cityId;
                    let tPlayer = null, tCityIdx = -1;
                    for (const p of state.players) { tCityIdx = p.cities.findIndex(c => c.id === tcId); if (tCityIdx !== -1) { tPlayer = p; break; } }
                    if (tPlayer) tPlayer.cities.splice(tCityIdx, 1);
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = payload.x + dx, ny = payload.y + dy;
                            if (nx >= 0 && nx < state.map.width && ny >= 0 && ny < state.map.height) {
                                const tile = state.map.tiles[ny][nx];
                                if (tile.unitIds.length > 0) state.players.forEach(p => p.units = p.units.filter(u => !tile.unitIds.includes(u.id)));
                                tile.terrain = 'desert'; tile.cityId = null; tile.ownerId = null; tile.buildingType = null; tile.wonder = undefined; tile.unitIds = []; tile.greatPerson = undefined;
                            }
                        }
                    } alert(`[원자론] 핵 공격이 감행되었습니다!`);
                } else {
                    player.cities.forEach(city => { city.hasActedThisTurn = false; city.hasHarvestedCulture = false; }); alert("핵발전소 가동! 도시 행동 회복.");
                } success = true; break;
            case 'metal_casting':
                const card = player.armyCards.find(c => c.id === payload.targetCardId);
                if (card) { card.attack += 3; success = true; } break;
        }

        if (success) {
            if (state.combatState && !state.combatState.log) state.combatState.log = [];
            state.combatState?.log?.push({ message: `✅ ${player.name}의 [${tech?.name}] 능력이 성공적으로 발동되었습니다!` });
        } else if (techId === 'steam_power') { state.steamPowerSource = null; }
    });
  }
});