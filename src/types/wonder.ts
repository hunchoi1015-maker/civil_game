export type WonderType = 'pyramids' | 'colossus' | 'statue_of_liberty';

export interface WonderDefinition {
  type: WonderType;
  name: string;
  cost: number; // 생산력 비용
  cultureProduction: number; // 턴당 문화 생산량
  description: string;
}

export const WONDERS: Record<WonderType, WonderDefinition> = {
  pyramids: {
    type: 'pyramids',
    name: '피라미드',
    cost: 200,
    cultureProduction: 2,
    description: '고대 불가사의입니다.',
  },
  colossus: {
    type: 'colossus',
    name: '거신상',
    cost: 300,
    cultureProduction: 3,
    description: '거대한 동상입니다.',
  },
  statue_of_liberty: {
    type: 'statue_of_liberty',
    name: '자유의 여신상',
    cost: 500,
    cultureProduction: 5,
    description: '매 턴 문화 트랙 전진 (추후 구현)',
  },
};