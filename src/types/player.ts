import { City } from './city';
import { Unit } from './unit';
import { ArmyCard } from './combat';
import { Technology } from './tech';
import { NationType } from './nation';

export interface Resources {
  trade: number;
  production: number;
  culture: number;
  currency: number;
  combatBonus: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  nation: NationType;           // 선택한 국가
  resources: Resources;
  cities: City[];
  units: Unit[];
  armyCards: ArmyCard[];
  technologies: Technology[];
  government: GovernmentType | null;
  cultureTrack: number;
  hasCapital: boolean;
  isEliminated: boolean;
  stackingLimitBonus: number;   // 기술로 얻은 추가 배치 제한
  hasCollectedTrade: boolean;   // 이번 턴에 교역 수령 여부
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export type GovernmentType =
  | 'despotism'
  | 'monarchy'
  | 'democracy'
  | 'republic'
  | 'communism'
  | 'fundamentalism';

export const GOVERNMENT_EFFECTS: Record<GovernmentType, GovernmentEffect> = {
  despotism: {
    name: '전제정',
    description: '기본 정치체제',
    tradeBonus: 0,
    productionBonus: 0,
    militaryBonus: 0,
  },
  monarchy: {
    name: '군주정',
    description: '생산력 보너스',
    tradeBonus: 0,
    productionBonus: 2,
    militaryBonus: 0,
  },
  democracy: {
    name: '민주정',
    description: '교역 보너스',
    tradeBonus: 3,
    productionBonus: 0,
    militaryBonus: 0,
  },
  republic: {
    name: '공화정',
    description: '균형잡힌 보너스',
    tradeBonus: 1,
    productionBonus: 1,
    militaryBonus: 0,
  },
  communism: {
    name: '공산주의',
    description: '생산력 대폭 보너스',
    tradeBonus: -1,
    productionBonus: 3,
    militaryBonus: 1,
  },
  fundamentalism: {
    name: '신정정치',
    description: '전투 보너스',
    tradeBonus: 0,
    productionBonus: 0,
    militaryBonus: 3,
  },
};

export interface GovernmentEffect {
  name: string;
  description: string;
  tradeBonus: number;
  productionBonus: number;
  militaryBonus: number;
}

export function createInitialResources(): Resources {
  return {
    trade: 0,
    production: 0,
    culture: 0,
    currency: 0,
    combatBonus: 0,
  };
}
