export type WonderType = 'pyramids' | 'colossus' | 'statue_of_liberty';
export type WonderEra = 'ancient' | 'medieval' | 'modern';

export interface WonderDefinition {
  type: WonderType;
  name: string;
  cost: number; 
  cultureProduction: number; 
  description: string;
  era: WonderEra;
  
  // 🌟 [추가] 생산력 할인 관련 데이터
  costReductionTech?: string; 
  costReductionAmount?: number; 
}

export const WONDERS: Record<WonderType, WonderDefinition> = {
  pyramids: {
    type: 'pyramids',
    name: '피라미드',
    cost: 2, // (기존에 설정하신 값 그대로)
    cultureProduction: 1,
    description: '고대 불가사의입니다. (석조기술 보유 시 생산력 1 감소)',
    era: 'ancient',
    costReductionTech: 'masonry', // 석조기술
    costReductionAmount: 1,       // 1 할인
  },
  colossus: {
    type: 'colossus',
    name: '거신상',
    cost: 3,
    cultureProduction: 2,
    description: '거대한 동상입니다.',
    era: 'medieval',
    // 할인이 없으므로 비워둠
  },
  statue_of_liberty: {
    type: 'statue_of_liberty',
    name: '자유의 여신상',
    cost: 5,
    cultureProduction: 3,
    description: '매 턴 문화 트랙 전진 (금속주조 보유 시 생산력 2 감소)',
    era: 'modern',
    costReductionTech: 'metal_casting', // 금속주조
    costReductionAmount: 2,             // 2 할인
  },
};