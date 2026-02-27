// 위인 직업 6종
export type GreatPersonType = 'artist' | 'inventor' | 'general' | 'humanitarian' | 'explorer' | 'scientist';

export interface GreatPersonStats {
  culture: number;
  trade: number;
  production: number;
  currency: number;
  combatBonus: number; // 장군 전용 (글로벌 패시브 중첩)
}

export interface GreatPerson {
  id: string;
  type: GreatPersonType;
  name: string; // 현재는 모두 'basic'
  description: string; // 위인의 한마디!
  stats: GreatPersonStats;
}