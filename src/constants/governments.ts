import { GovernmentType, GovernmentEffect } from '../types';

export interface GovernmentDefinition extends GovernmentEffect {
  type: GovernmentType;
  requiredTech: string | null;
}

export const GOVERNMENTS: Record<GovernmentType, GovernmentDefinition> = {
  despotism: {
    type: 'despotism',
    name: '전제정',
    description: '초기 정치체제. 안정적이지만 성장에 한계가 있음.',
    tradeBonus: 0,
    productionBonus: 0,
    militaryBonus: 0,
    requiredTech: null,
  },
  monarchy: {
    type: 'monarchy',
    name: '군주정',
    description: '왕의 통치 아래 생산력이 증가함.',
    tradeBonus: 0,
    productionBonus: 2,
    militaryBonus: 1,
    requiredTech: 'chivalry',
  },
  democracy: {
    type: 'democracy',
    name: '민주정',
    description: '시민의 자유로 교역이 활성화됨.',
    tradeBonus: 3,
    productionBonus: 0,
    militaryBonus: -1,
    requiredTech: 'democracy_tech',
  },
  republic: {
    type: 'republic',
    name: '공화정',
    description: '균형잡힌 정치체제.',
    tradeBonus: 1,
    productionBonus: 1,
    militaryBonus: 0,
    requiredTech: 'democracy_tech',
  },
  communism: {
    type: 'communism',
    name: '공산주의',
    description: '집단 생산으로 생산력이 대폭 증가하나 교역이 감소함.',
    tradeBonus: -1,
    productionBonus: 3,
    militaryBonus: 1,
    requiredTech: 'communism_tech',
  },
  fundamentalism: {
    type: 'fundamentalism',
    name: '신정정치',
    description: '종교적 열정으로 전투력이 증가함.',
    tradeBonus: 0,
    productionBonus: 0,
    militaryBonus: 3,
    requiredTech: 'theology',
  },
};

export function getAvailableGovernments(researchedTechs: string[]): GovernmentDefinition[] {
  return Object.values(GOVERNMENTS).filter(
    gov => gov.requiredTech === null || researchedTechs.includes(gov.requiredTech)
  );
}

export function getGovernmentDefinition(type: GovernmentType): GovernmentDefinition {
  return GOVERNMENTS[type];
}
