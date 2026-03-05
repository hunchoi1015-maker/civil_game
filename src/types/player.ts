import { City } from './city';
import { Unit } from './unit';
import { ArmyCard } from './combat';
import { PlayerTechnology } from './tech';
import { NationType } from './nation';
import {ResourceType} from './map';
import { CultureEventCard } from './game';
import { GreatPerson } from './greatPerson';

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
  unplacedGreatPeople: GreatPerson[]; // 배치하지 않은 위인 
  nuclearMaterial: number;// 핵 자원 (상대에게 안 보임)
  cultureEventCards: CultureEventCard[]; 
  pendingGreatPerson: boolean; // 위인을 획득하여 배치 대기 중인지 여부
  pendingCardDraw: number | null;
  invalidatedWonders?: string[]; //효과가 무효화된 불가사의 ID 목록
  builtWonders?: string[];
  freeGovernmentSwitch?: boolean; //갓 연구하여 무정부 없이 체제를 바꿀 수 있는 1턴의 기회 플래그
  hasUsedEngineeringThisTurn?: boolean;
  hasUsedMassMediaThisTurn?: boolean;
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export type GovernmentType =
  | 'despotism'      // 전제정치
  | 'republic'       // 공화제
  | 'monarchy'       // 군주제
  | 'democracy'      // 민주주의
  | 'feudalism'      // 봉건제
  | 'communism'      // 공산주의
  | 'fundamentalism' // 근본주의
  | 'anarchy';       // 무정부 (행동 불가 페널티 상태)

export function createInitialResources(): Resources {
  return {
    trade: 0,
    production: 0,
    culture: 38,
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
