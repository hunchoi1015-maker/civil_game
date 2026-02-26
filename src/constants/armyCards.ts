import { ArmyCardType, ArmyTier } from '../types';

// 공격력/체력 선택 옵션 (총합은 티어별 전투력과 동일)
export interface AttackHealthOption {
  attack: number;
  health: number;
}

export interface ArmyCardTemplate {
  type: ArmyCardType;
  tier: ArmyTier;
  name: string;
  totalCombatPower: number;      // 공격력 + 체력 총합
  attackHealthOptions: AttackHealthOption[];  // 선택 가능한 공격력/체력 조합
  productionCost: number;        // (유지) 카드별 개별 비용
  requiredTech: string | null;
}

// 티어별 전투력 총합: 4/6/8/10
// 공격력/체력 선택 가능 (예: 4면 1/3, 2/2, 3/1)
function generateOptions(total: number): AttackHealthOption[] {
  const options: AttackHealthOption[] = [];
  for (let attack = 1; attack < total; attack++) {
    options.push({ attack, health: total - attack });
  }
  return options;
}
export const ARMY_CARD_TEMPLATES: ArmyCardTemplate[] = [
  // ==================== 보병 (Infantry) ====================
  {
    type: 'infantry', tier: 1, name: '민병대', totalCombatPower: 4,
    attackHealthOptions: generateOptions(4), productionCost: 2,
    requiredTech: null, // 기본 해금
  },
  {
    type: 'infantry', tier: 2, name: '검사', totalCombatPower: 6,
    attackHealthOptions: generateOptions(6), productionCost: 2,
    requiredTech: 'democracy', // 민주주의
  },
  {
    type: 'infantry', tier: 3, name: '소총병', totalCombatPower: 8,
    attackHealthOptions: generateOptions(8), productionCost: 2,
    requiredTech: 'gunpowder', // 화약 
  },
  {
    type: 'infantry', tier: 4, name: '현대 보병', totalCombatPower: 10,
    attackHealthOptions: generateOptions(10), productionCost: 2,
    requiredTech: 'replaceable_parts', // 교체부품
  },

  // ==================== 포병 (Artillery) ====================
  {
    type: 'artillery', tier: 1, name: '투석기', totalCombatPower: 4,
    attackHealthOptions: generateOptions(4), productionCost: 2,
    requiredTech: null, // 기본 해금
  },
  {
    type: 'artillery', tier: 2, name: '대포', totalCombatPower: 6,
    attackHealthOptions: generateOptions(6), productionCost: 2,
    requiredTech: 'mathematics', // 수학
  },
  {
    type: 'artillery', tier: 3, name: '야포', totalCombatPower: 8,
    attackHealthOptions: generateOptions(8), productionCost: 2,
    requiredTech: 'metallurgy', // 금속주조
  },
  {
    type: 'artillery', tier: 4, name: '로켓포', totalCombatPower: 10,
    attackHealthOptions: generateOptions(10), productionCost: 2,
    requiredTech: 'ballistics', // 탄도학
  },

  // ==================== 기병 (Cavalry) ====================
  {
    type: 'cavalry', tier: 1, name: '경기병', totalCombatPower: 4,
    attackHealthOptions: generateOptions(4), productionCost: 2,
    requiredTech: null, // 기본 해금
  },
  {
    type: 'cavalry', tier: 2, name: '기사', totalCombatPower: 6,
    attackHealthOptions: generateOptions(6), productionCost: 2,
    requiredTech: 'chivalry', // 기사도
  },
  {
    type: 'cavalry', tier: 3, name: '기갑병', totalCombatPower: 8,
    attackHealthOptions: generateOptions(8), productionCost: 2,
    requiredTech: 'railroad', // 철도
  },
  {
    type: 'cavalry', tier: 4, name: '전차', totalCombatPower: 10,
    attackHealthOptions: generateOptions(10), productionCost: 2,
    requiredTech: 'combustion', // 연소
  },

  // ==================== 공군 (Airforce) ====================
  // 기획상 4레벨 '비행(flight)' 기술이 공군을 해금합니다.
  {
    type: 'airforce', tier: 4, name: '스텔스기', totalCombatPower: 10,
    attackHealthOptions: generateOptions(10), productionCost: 2,
    requiredTech: 'flight', // 🌟 수정됨 (비행)
  },
];

export function getArmyCardTemplate(
  type: ArmyCardType,
  tier: ArmyTier
): ArmyCardTemplate | undefined {
  return ARMY_CARD_TEMPLATES.find(t => t.type === type && t.tier === tier);
}

export function getAvailableArmyCards(researchedTechs: string[]): ArmyCardTemplate[] {
  // 1. 조건에 맞는 카드들을 먼저 불러옵니다.
  const unlocked = ARMY_CARD_TEMPLATES.filter(
    template =>
      template.requiredTech === null || researchedTechs.includes(template.requiredTech)
  );

  // 🌟 3. 하위 티어 단종 필터 복구
  // 각 부대 타입(보병, 기병 등)별로 가장 높은 티어만 걸러냅니다.
  const highestTiers: Record<string, ArmyCardTemplate> = {};
  unlocked.forEach(card => {
      if (!highestTiers[card.type] || highestTiers[card.type].tier < card.tier) {
          highestTiers[card.type] = card;
      }
  });

  return Object.values(highestTiers);
}

export function getArmyCardsByType(type: ArmyCardType): ArmyCardTemplate[] {
  return ARMY_CARD_TEMPLATES.filter(t => t.type === type);
}

// 최고 티어 카드 조회
export function getHighestTierCard(type: ArmyCardType, researchedTechs: string[]): ArmyCardTemplate | undefined {
  const available = getAvailableArmyCards(researchedTechs).filter(t => t.type === type);
  // (getAvailableArmyCards에서 이미 타입별 최고 티어만 반환하므로 바로 0번 인덱스를 줘도 무방하지만 안전을 위해 정렬 유지)
  return available.sort((a, b) => b.tier - a.tier)[0];
}