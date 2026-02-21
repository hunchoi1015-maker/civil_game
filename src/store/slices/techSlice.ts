import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { TECHNOLOGIES } from '../../constants/technologies';
import { Player } from '../../types/player';
import { PlayerTechnology } from '../../types/tech';
import {TECH_COSTS} from '../../types'

// 🌟 [피라미드 검증 헬퍼 함수]
export function canResearchPyramid(player: Player, targetTechId: string): { canResearch: boolean, reason?: string } {
  const targetTechDef = TECHNOLOGIES.find(t => t.id === targetTechId);
  if (!targetTechDef) return { canResearch: false, reason: "존재하지 않는 기술입니다." };

  if (player.technologies.some(t => t.id === targetTechId)) {
    return { canResearch: false, reason: "이미 연구한 기술입니다." };
  }

  // 피라미드 레벨 판독기 (시작 기술은 1레벨로 취급)
  const getPyramidLevel = (techId: string) => {
    const def = TECHNOLOGIES.find(t => t.id === techId);
    if (!def) return 1;
    if (def.isStartingTechFor) return 1; // 💡 러시아/이집트 등 고유 기술 예외 처리
    return def.level;
  };

  const targetPyramidLevel = getPyramidLevel(targetTechId);

  // 1레벨은 조건 없이 언제든 연구 가능
  if (targetPyramidLevel === 1) return { canResearch: true };

  // 현재 보유한 기술들의 피라미드 레벨별 개수 집계
  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  player.technologies.forEach(tech => {
    const pLevel = getPyramidLevel(tech.id);
    levelCounts[pLevel] = (levelCounts[pLevel] || 0) + 1;
  });

  const requiredLowerTechCount = levelCounts[targetPyramidLevel - 1] || 0;
  const currentTargetLevelCount = levelCounts[targetPyramidLevel] || 0;

  // 하위 기술 보유 수 > 현재 목표 레벨 보유 수
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
  useTechResourceAbility: (techId: string, payload?: any) => void; // 다음 단계에서 만들 1턴 1회 스킬
  turnResearchResults: { playerId: string; techId: string; techName: string }[];
  showResearchResults: boolean;
  setShowResearchResults: (show: boolean) => void;
  clearResearchResults: () => void;
}

export const createTechSlice: StateCreator<GameStore, [["zustand/immer", never]], [], TechSlice> = (set, get) => ({
  turnResearchResults: [],
  showResearchResults: false,
  setShowResearchResults: (show) => set((state) => { state.showResearchResults = show; }),
  clearResearchResults: () => set((state) => { state.turnResearchResults = []; }),

  researchTech: (techId: string) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const techDef = TECHNOLOGIES.find(t => t.id === techId);
      if (!techDef) return;

      // 1. 기술 피라미드 연구 가능 여부 검사
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
      player.resources.trade -= cost; // 교역 토큰 차감!

      // 2. 플레이어 기술 인벤토리에 새 구조체로 추가
      const newTech: PlayerTechnology = {
          ...techDef,
          isResearched: true,
          tokensOnCard: 0,
          abilityUsedThisTurn: false
      };
      player.technologies.push(newTech);

      state.turnResearchResults.push({
          playerId: player.id,
          techId: techId,
          techName: techDef.name
      });

      // 3. 🚀 건물 자동 개량 (예: 신전 -> 대성당) 🚀
      if (techDef.upgradesBuilding) {
          const fromBuilding = techDef.upgradesBuilding.from;
          const toBuilding = techDef.upgradesBuilding.to;
          
          player.cities.forEach(city => {
              city.buildings.forEach(building => {
                  if (building.type === fromBuilding) {
                      building.type = toBuilding as any;
                  }
              });
          });
      }

      // 4. 🚀 부대 자동 개량 (예: 민병대 -> 검사) 🚀
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
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      // 해당 기술을 보유하고 있는지, 그리고 커스텀 타입(PlayerTechnology)으로 잘 들어있는지 확인
      const tech = player.technologies.find(t => t.id === techId);
      
      if (!tech) {
          alert("아직 연구하지 않은 기술입니다.");
          return;
      }
      if (!tech.resourceAbility) {
          alert("이 기술에는 사용할 수 있는 자원 능력이 없습니다.");
          return;
      }
      if (tech.abilityUsedThisTurn) {
          alert("이 기술의 자원 능력은 이번 턴에 이미 사용했습니다.");
          return;
      }

      // === [개별 기술 능력 처리 분기점] ===
      let success = false; // 스킬 사용 성공 여부 (성공 시에만 자원 차감 & 플래그 true)

      switch (techId) {
        case 'pottery': // [도자기] 임의 자원 2개 소모 -> 화폐 토큰 1개 획득 (최대 4)
          if (tech.tokensOnCard >= (tech.resourceAbility.maxTokens || 4)) {
              alert("이 기술 카드에 더 이상 화폐 토큰을 올릴 수 없습니다.");
              return;
          }
          if (payload?.consumedResources) {
              // 1. 선택한 자원들을 창고에서 차감
              Object.entries(payload.consumedResources).forEach(([res, amount]) => {
                  player.luxuryResources[res as keyof typeof player.luxuryResources] -= (amount as number);
              });
              
              // 2. 화폐 증가 (카드 위 토큰 + 내 실제 화폐 모두 증가)
              tech.tokensOnCard += 1;
              player.resources.currency = Math.min(player.resources.currency + 1, 4); // 최대 4개 제한
              success = true;
          }
          break;

        case 'philosophy': // [철학] 임의 자원 3개 소모 -> 위인 마커 1개 획득
          if (payload?.consumedResources) {
              // 1. 선택한 자원들을 창고에서 차감
              Object.entries(payload.consumedResources).forEach(([res, amount]) => {
                  player.luxuryResources[res as keyof typeof player.luxuryResources] -= (amount as number);
              });
              
              // 2. 위인 마커 1개 추가!
              player.greatPeople += 1;
              success = true;
          }
          break;

        case 'writing': // [기록] 스파이 1개 소모 -> 상대 도시 마비
          if (player.spies >= 1 && payload?.targetCityId && payload?.targetPlayerId) {
              const targetPlayer = state.players.find(p => p.id === payload.targetPlayerId);
              if (targetPlayer) {
                  const targetCity = targetPlayer.cities.find(c => c.id === payload.targetCityId);
                  if (targetCity) {
                      player.spies -= 1; // 스파이 소모
                      targetCity.isParalyzed = true; // 🌟 도시 마비!
                      success = true;
                  }
              }
          } else {
              alert("스파이가 부족하거나 대상을 선택하지 않았습니다.");
          }
          break;

        case 'communism': // [공산주의] 스파이 1개 소모 -> 타일 마비
          if (player.spies >= 1 && payload?.x !== undefined && payload?.y !== undefined) {
             const tile = state.map.tiles[payload.y][payload.x];
             player.spies -= 1; // 스파이 소모
             tile.isParalyzed = true; // 🌟 타일 마비!
             success = true;
          } else {
              alert("스파이가 부족하거나 대상을 선택하지 않았습니다.");
          }
          break;

        case 'currency': // [통화] 향료 1개 소모 -> 문화 3 획득
          if (player.luxuryResources.spice >= 1) {
              player.luxuryResources.spice -= 1;
              player.resources.culture += 3;
              success = true;
          } else alert("향료가 부족합니다.");
          break;

        case 'animal_husbandry': // [축산] 밀 1개 소모 -> 내 도시 하나에 생산력 +3
          if (player.luxuryResources.wheat >= 1 && payload?.targetCityId) {
              const targetCity = player.cities.find(c => c.id === payload.targetCityId);
              if (targetCity) {
                  player.luxuryResources.wheat -= 1;
                  // 🌟 해당 도시의 이번 턴 임시 생산력에 +3 추가!
                  targetCity.tempProductionBonus = (targetCity.tempProductionBonus || 0) + 3;
                  success = true;
              }
          } else alert("밀이 부족하거나 도시를 선택하지 않았습니다.");
          break;

        case 'construction': // [건설] 밀 1개 소모 -> 내 도시 하나에 생산력 +5
          if (player.luxuryResources.wheat >= 1 && payload?.targetCityId) {
              const targetCity = player.cities.find(c => c.id === payload.targetCityId);
              if (targetCity) {
                  player.luxuryResources.wheat -= 1;
                  targetCity.tempProductionBonus = (targetCity.tempProductionBonus || 0) + 5;
                  success = true;
              }
          } else alert("밀이 부족하거나 도시를 선택하지 않았습니다.");
          break;

        case 'finance': // [금융] 밀 1개 소모 -> 내 도시 하나에 생산력 +7
          if (player.luxuryResources.wheat >= 1 && payload?.targetCityId) {
              const targetCity = player.cities.find(c => c.id === payload.targetCityId);
              if (targetCity) {
                  player.luxuryResources.wheat -= 1;
                  targetCity.tempProductionBonus = (targetCity.tempProductionBonus || 0) + 7;
                  success = true;
              }
          } else alert("밀이 부족하거나 도시를 선택하지 않았습니다.");
          break;

        case 'chivalry': // [기사도] 향료 1개 소모 -> 문화 5 획득
          if (player.luxuryResources.spice >= 1) {
              player.luxuryResources.spice -= 1;
              player.resources.culture += 5;
              success = true;
          } else alert("향료가 부족합니다.");
          break;

        case 'metallurgy': // [금속주조] 향료 1개 소모 -> 문화 7 획득
          if (player.luxuryResources.spice >= 1) {
              player.luxuryResources.spice -= 1;
              player.resources.culture += 7;
              success = true;
          } else alert("향료가 부족합니다.");
          break;

        // ==========================================
        // 🌟 토큰 쌓기 기술들 (화폐 최대 4개 제한)
        // ==========================================
        case 'printing_press': // [인쇄기] 문화 5 소모 -> 화폐 토큰 1개 획득
          if (tech.tokensOnCard >= (tech.resourceAbility.maxTokens || 4)) {
              alert("이 기술 카드에 더 이상 화폐 토큰을 올릴 수 없습니다.");
              return;
          }
          if (player.resources.culture >= 5) {
              player.resources.culture -= 5;
              tech.tokensOnCard += 1;
              player.resources.currency = Math.min(player.resources.currency + 1, 4);
              success = true;
          } else alert("문화 토큰이 부족합니다.");
          break;

        case 'democracy': // [민주주의] 교역 6 소모 -> 화폐 토큰 1개 획득
          if (tech.tokensOnCard >= (tech.resourceAbility.maxTokens || 4)) {
              alert("이 기술 카드에 더 이상 화폐 토큰을 올릴 수 없습니다.");
              return;
          }
          if (player.resources.trade >= 6) {
              player.resources.trade -= 6; // 교역 차감
              tech.tokensOnCard += 1;      // 카드 위 토큰 증가
              player.resources.currency = Math.min(player.resources.currency + 1, 4); // 전체 화폐 증가
              success = true;
          } else alert("교역 토큰이 부족합니다.");
          break;
          
        default:
          alert("구현 준비 중인 능력입니다.");
          break;
      }

      // 🌟 스킬 발동에 성공했다면, 이번 턴 사용 플래그를 true로 변경
      if (success) {
          tech.abilityUsedThisTurn = true;
          // (선택 사항) 효과음이나 성공 알림을 띄울 수 있습니다.
      }
    });
  }
});