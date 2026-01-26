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
  productionCost: number;        // 모두 2로 통일
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
  // 보병 (Infantry) - 기본 유닛
  {
    type: 'infantry',
    tier: 1,
    name: '민병대',
    totalCombatPower: 4,
    attackHealthOptions: generateOptions(4),
    productionCost: 2,
    requiredTech: null,
  },
  {
    type: 'infantry',
    tier: 2,
    name: '검사',
    totalCombatPower: 6,
    attackHealthOptions: generateOptions(6),
    productionCost: 2,
    requiredTech: 'iron_working',
  },
  {
    type: 'infantry',
    tier: 3,
    name: '소총병',
    totalCombatPower: 8,
    attackHealthOptions: generateOptions(8),
    productionCost: 2,
    requiredTech: 'industrialization',
  },
  {
    type: 'infantry',
    tier: 4,
    name: '현대 보병',
    totalCombatPower: 10,
    attackHealthOptions: generateOptions(10),
    productionCost: 2,
    requiredTech: 'advanced_flight',
  },

  // 포병 (Artillery) - 보병에 선제공격
  {
    type: 'artillery',
    tier: 1,
    name: '투석기',
    totalCombatPower: 4,
    attackHealthOptions: generateOptions(4),
    productionCost: 2,
    requiredTech: 'construction',
  },
  {
    type: 'artillery',
    tier: 2,
    name: '대포',
    totalCombatPower: 6,
    attackHealthOptions: generateOptions(6),
    productionCost: 2,
    requiredTech: 'gunpowder',
  },
  {
    type: 'artillery',
    tier: 3,
    name: '야포',
    totalCombatPower: 8,
    attackHealthOptions: generateOptions(8),
    productionCost: 2,
    requiredTech: 'industrialization',
  },
  {
    type: 'artillery',
    tier: 4,
    name: '로켓포',
    totalCombatPower: 10,
    attackHealthOptions: generateOptions(10),
    productionCost: 2,
    requiredTech: 'nuclear_power',
  },

  // 기병 (Cavalry) - 포병에 선제공격
  {
    type: 'cavalry',
    tier: 1,
    name: '경기병',
    totalCombatPower: 4,
    attackHealthOptions: generateOptions(4),
    productionCost: 2,
    requiredTech: 'animal_husbandry',
  },
  {
    type: 'cavalry',
    tier: 2,
    name: '기사',
    totalCombatPower: 6,
    attackHealthOptions: generateOptions(6),
    productionCost: 2,
    requiredTech: 'chivalry',
  },
  {
    type: 'cavalry',
    tier: 3,
    name: '기갑병',
    totalCombatPower: 8,
    attackHealthOptions: generateOptions(8),
    productionCost: 2,
    requiredTech: 'industrialization',
  },
  {
    type: 'cavalry',
    tier: 4,
    name: '전차',
    totalCombatPower: 10,
    attackHealthOptions: generateOptions(10),
    productionCost: 2,
    requiredTech: 'nuclear_power',
  },

  // 공군 (Airforce) - 무상성
  {
    type: 'airforce',
    tier: 1,
    name: '정찰기',
    totalCombatPower: 4,
    attackHealthOptions: generateOptions(4),
    productionCost: 2,
    requiredTech: 'railroad',
  },
  {
    type: 'airforce',
    tier: 2,
    name: '전투기',
    totalCombatPower: 6,
    attackHealthOptions: generateOptions(6),
    productionCost: 2,
    requiredTech: 'industrialization',
  },
  {
    type: 'airforce',
    tier: 3,
    name: '폭격기',
    totalCombatPower: 8,
    attackHealthOptions: generateOptions(8),
    productionCost: 2,
    requiredTech: 'democracy_tech',
  },
  {
    type: 'airforce',
    tier: 4,
    name: '스텔스기',
    totalCombatPower: 10,
    attackHealthOptions: generateOptions(10),
    productionCost: 2,
    requiredTech: 'advanced_flight',
  },
];

export function getArmyCardTemplate(
  type: ArmyCardType,
  tier: ArmyTier
): ArmyCardTemplate | undefined {
  return ARMY_CARD_TEMPLATES.find(t => t.type === type && t.tier === tier);
}

export function getAvailableArmyCards(researchedTechs: string[]): ArmyCardTemplate[] {
  return ARMY_CARD_TEMPLATES.filter(
    template =>
      template.requiredTech === null || researchedTechs.includes(template.requiredTech)
  );
}

export function getArmyCardsByType(type: ArmyCardType): ArmyCardTemplate[] {
  return ARMY_CARD_TEMPLATES.filter(t => t.type === type);
}

// 최고 티어 카드 조회
export function getHighestTierCard(type: ArmyCardType, researchedTechs: string[]): ArmyCardTemplate | undefined {
  const available = getAvailableArmyCards(researchedTechs).filter(t => t.type === type);
  return available.sort((a, b) => b.tier - a.tier)[0];
}
