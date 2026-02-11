/**
 * 기술 슬라이스 (업데이트)
 * 
 * ✅ 7.2: 교역 자원 전체 소모 (화폐만큼 남김)
 * ✅ 7.4: 티어 기술 개발 시 하위 유닛 진급 및 생산 불가
 * ✅ 7.6: 연구 관련 문화 획득 제거
 */

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, TurnResearchResult } from '../types/storeTypes';
import { ArmyCardType, ArmyTier, createArmyCard, Technology } from '../../types';
import { TECHNOLOGIES } from '../../constants/technologies';
import { 
  findPlayerById, 
  hasTechnology, 
  canResearchTechLevel,
  getMaxResearchedTier,
  canProduceTier,
  getAvailableTrade 
} from '../helpers/playerHelpers';

export interface TechSlice {
  researchTech: (playerId: string, techId: string) => boolean;
  produceArmyCard: (
    playerId: string, 
    type: ArmyCardType, 
    tier: ArmyTier, 
    attack: number, 
    health: number, 
    name: string, 
    cityId?: string
  ) => void;
  removeArmyCard: (playerId: string, cardId: string) => void;
  turnResearchResults: TurnResearchResult[];
  showResearchResults: boolean;
  recordResearch: (playerId: string, techId: string, techName: string) => void;
  clearResearchResults: () => void;
  setShowResearchResults: (show: boolean) => void;
}

export const createTechSlice: StateCreator<
  GameStore, 
  [["zustand/immer", never]], 
  [], 
  TechSlice
> = (set, get) => ({
  turnResearchResults: [],
  showResearchResults: false,

  researchTech: (playerId: string, techId: string) => {
    // 연구 단계 확인
    if (get().currentPhase !== 'research') {
      console.log('[Tech] 연구 단계가 아닙니다');
      return false;
    }

    const player = findPlayerById(get().players, playerId);
    if (!player) {
      console.log('[Tech] 플레이어를 찾을 수 없습니다');
      return false;
    }

    // 턴당 1회 제한
    if (player.hasResearchedThisTurn) {
      console.log('[Tech] 이미 연구했습니다');
      return false;
    }

    const tech = TECHNOLOGIES.find((t) => t.id === techId);
    if (!tech) {
      console.log('[Tech] 기술을 찾을 수 없습니다:', techId);
      return false;
    }

    // 이미 연구 확인
    if (hasTechnology(player, techId)) {
      console.log('[Tech] 이미 연구한 기술:', tech.name);
      return false;
    }

    // 7.2: 교역 자원 계산 (전체 - 화폐)
    const availableTrade = getAvailableTrade(player);
    const techCost = tech.cost;

    console.log('[Tech] 교역 확인:', {
      total: player.resources.trade,
      currency: player.resources.currency,
      available: availableTrade,
      cost: techCost,
    });

    if (availableTrade < techCost) {
      console.log('[Tech] 교역 자원 부족');
      return false;
    }

    // 피라미드 제약 확인
    if (!canResearchTechLevel(player, tech.level)) {
      console.log('[Tech] 피라미드 제약 위반');
      return false;
    }

    // 연구 진행
    set((state) => {
      const p = findPlayerById(state.players, playerId);
      if (!p) return;

      // 7.2: 교역 자원 전체 소모, 화폐만큼 남김
      console.log(`[Tech] 교역: ${p.resources.trade} → ${p.resources.currency}`);
      p.resources.trade = p.resources.currency;

      // 기술 추가
      p.technologies.push({ ...tech, isResearched: true });
      p.hasResearchedThisTurn = true;

      console.log(`[Tech] ${tech.name} 연구 완료!`);

      // 7.4: 유닛 진급 처리
      const upgradeResult = upgradeUnitsForTech(p, tech);
      if (upgradeResult.upgraded) {
        console.log(
          `[Tech] 유닛 진급: ${upgradeResult.count}개 유닛 ` +
          `Tier ${upgradeResult.from} → Tier ${upgradeResult.to}`
        );
      }
    });

    // 7.6: 문화 파라미터 제거됨
    get().recordResearch(playerId, techId, tech.name);
    return true;
  },

  produceArmyCard: (
    playerId: string, 
    type: ArmyCardType, 
    tier: ArmyTier, 
    attack: number, 
    health: number, 
    name: string, 
    cityId?: string
  ) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;

      // 도시 행동 확인
      if (state.currentPhase === 'cityManagement' && cityId) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city?.hasActedThisTurn) return;
      }

      // 7.4: 하위 티어 생산 불가 확인
      if (!canProduceTier(player, type, tier)) {
        console.log(`[Tech] Tier ${tier} ${type} 생산 불가 (더 높은 티어 연구됨)`);
        return;
      }

      // 카드 생성
      const card = createArmyCard(uuidv4(), type, tier, playerId, attack, health, name);
      player.armyCards.push(card);
      console.log(`[Tech] ${name} (${attack}/${health}) 생산 완료`);

      // 도시 행동 완료 표시
      if (state.currentPhase === 'cityManagement' && cityId) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city) city.hasActedThisTurn = true;
      }
    });
  },

  removeArmyCard: (playerId: string, cardId: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;

      const cardIndex = player.armyCards.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1) {
        player.armyCards.splice(cardIndex, 1);
      }
    });
  },

  recordResearch: (playerId: string, techId: string, techName: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      const existingIndex = state.turnResearchResults.findIndex(
        (r) => r.playerId === playerId
      );

      if (existingIndex >= 0) {
        state.turnResearchResults[existingIndex] = {
          playerId,
          playerName: player?.name || '',
          techId,
          techName,
          // 7.6: culture 필드 제거됨
        };
      } else {
        state.turnResearchResults.push({
          playerId,
          playerName: player?.name || '',
          techId,
          techName,
          // 7.6: culture 필드 제거됨
        });
      }
    });
  },

  clearResearchResults: () => {
    set((state) => {
      state.turnResearchResults = [];
      state.showResearchResults = false;
    });
  },

  setShowResearchResults: (show: boolean) => {
    set((state) => {
      state.showResearchResults = show;
    });
  },
});

// ============================================================================
// 7.4 구현: 유닛 진급 시스템
// ============================================================================

interface UpgradeResult {
  upgraded: boolean;
  count: number;
  from: ArmyTier | null;
  to: ArmyTier | null;
}

/**
 * 기술 연구 시 유닛 진급 처리
 */
function upgradeUnitsForTech(player: any, tech: Technology): UpgradeResult {
  const result: UpgradeResult = {
    upgraded: false,
    count: 0,
    from: null,
    to: null,
  };

  // unlock에서 armyTier 확인
  const armyTierUnlocks = tech.unlocks?.filter((u) => u.type === 'armyTier') || [];
  if (armyTierUnlocks.length === 0) return result;

  // 각 unlock 처리
  for (const unlock of armyTierUnlocks) {
    const parts = unlock.id.split('_');
    if (parts.length !== 2) continue;

    const targetType = parts[0] as ArmyCardType;
    const targetTier = parseInt(parts[1]) as ArmyTier;

    // 같은 타입의 하위 티어 카드 진급
    const lowerTierCards = player.armyCards.filter(
      (card: any) => card.type === targetType && card.tier < targetTier
    );

    for (const card of lowerTierCards) {
      const oldTier = card.tier;

      // 전투력 비율 유지하며 진급
      const oldTotal = getTierPower(oldTier);
      const newTotal = getTierPower(targetTier);

      const attackRatio = card.attack / oldTotal;
      const healthRatio = card.health / oldTotal;

      card.tier = targetTier;
      card.attack = Math.round(attackRatio * newTotal);
      card.health = Math.round(healthRatio * newTotal);

      // 반올림 오차 보정
      const diff = newTotal - (card.attack + card.health);
      if (diff !== 0) card.health += diff;

      result.upgraded = true;
      result.count++;
      result.from = oldTier;
      result.to = targetTier;

      console.log(
        `[Tech] 진급: ${targetType} (${Math.round(attackRatio * oldTotal)}/` +
        `${Math.round(healthRatio * oldTotal)}) → (${card.attack}/${card.health})`
      );
    }
  }

  return result;
}

/**
 * 티어별 총 전투력
 */
function getTierPower(tier: ArmyTier): number {
  const powers: Record<ArmyTier, number> = { 1: 4, 2: 6, 3: 8, 4: 10 };
  return powers[tier];
}