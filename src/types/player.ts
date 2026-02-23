import { City } from './city';
import { Unit } from './unit';
import { ArmyCard } from './combat';
import { PlayerTechnology } from './tech';
import { NationType } from './nation';
import {ResourceType} from './map';
import { CultureEventCard } from './game';

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
  technologies: PlayerTechnology[];
  government: GovernmentType | null;
  cultureTrack: number;
  hasCapital: boolean;
  isEliminated: boolean;
  stackingLimitBonus: number;   // 기술로 얻은 추가 배치 제한
  hasCollectedTrade: boolean;   // 이번 턴에 교역 수령 여부
  hasResearchedThisTurn: boolean; // 이번 턴 연구 여부
  luxuryResources: Record<Exclude<ResourceType, 'none'>, number>;
  spies: number;          // 스파이 (상대에게 안 보임)
  greatPeople: number;    // 위인 (공개)
  nuclearMaterial: number;// 핵 자원 (상대에게 안 보임)
  cultureEventCards: CultureEventCard[]; 
  pendingGreatPerson: boolean; // 위인을 획득하여 배치 대기 중인지 여부
  pendingCardDraw: number | null;
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
export const createInitialLuxuryResources = (): Record<Exclude<ResourceType, 'none'>, number> => ({
  spice: 3,
  wheat: 3,
  silk: 3,
  iron: 30,
});
