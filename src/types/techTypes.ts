/**
 * 기술 관련 타입 정의
 * 
 * ✅ 7.6: 연구 관련 문화 획득 제거
 */

import { ArmyCardType, ArmyTier } from 'src/types';

/**
 * 연구 결과 (턴당)
 * 7.6: culture 필드 제거됨
 */
export interface TurnResearchResult {
  playerId: string;
  playerName: string;
  techId: string;
  techName: string;
  // culture: number; // ❌ 제거됨
}

/**
 * 유닛 진급 정보
 */
export interface UnitUpgradeInfo {
  cardId: string;
  type: ArmyCardType;
  fromTier: ArmyTier;
  toTier: ArmyTier;
  oldAttack: number;
  oldHealth: number;
  newAttack: number;
  newHealth: number;
}

/**
 * 기술 연구 결과 (확장)
 */
export interface TechResearchResult {
  success: boolean;
  techId: string;
  techName: string;
  tradeSpent: number; // 소모된 교역
  tradeRemaining: number; // 남은 교역 (= 화폐)
  unitsUpgraded: UnitUpgradeInfo[]; // 진급한 유닛들
  // culture: number; // ❌ 제거됨
}

/**
 * 기술 통계
 */
export interface TechStatistics {
  totalTechs: number;
  researchedTechs: number;
  researchProgress: number; // 퍼센트
  byLevel: {
    level: number;
    total: number;
    researched: number;
  }[];
}

/**
 * 부대 생산 제한 정보
 */
export interface ArmyProductionConstraints {
  type: ArmyCardType;
  maxResearchedTier: ArmyTier;
  canProduceTiers: ArmyTier[];
  blockedTiers: ArmyTier[];
}