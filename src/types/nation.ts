// 국가 시스템
export type NationType = 'america' | 'rome' | 'egypt' | 'china' | 'russia' | 'germany';

export interface Nation {
  id: NationType;
  name: string;
  description: string;
  bonus: NationBonus;
  color: string;
  flag: string;
}

export interface NationBonus {
  tradeBonus: number;
  productionBonus: number;
  cultureBonus: number;
  militaryBonus: number;
  specialAbility?: string;
}

export const NATIONS: Record<NationType, Nation> = {
  america: {
    id: 'america',
    name: '미국',
    description: '자유의 나라. 교역에 보너스.',
    bonus: {
      tradeBonus: 2,
      productionBonus: 0,
      cultureBonus: 1,
      militaryBonus: 0,
      specialAbility: '민주주의 기술 연구 비용 -3',
    },
    color: '#3B82F6',
    flag: '🇺🇸',
  },
  rome: {
    id: 'rome',
    name: '로마',
    description: '영원한 제국. 군사력에 보너스.',
    bonus: {
      tradeBonus: 0,
      productionBonus: 1,
      cultureBonus: 0,
      militaryBonus: 2,
      specialAbility: '도로 건설 시 이동력 +1',
    },
    color: '#DC2626',
    flag: '🏛️',
  },
  egypt: {
    id: 'egypt',
    name: '이집트',
    description: '고대의 신비. 문화에 보너스.',
    bonus: {
      tradeBonus: 0,
      productionBonus: 0,
      cultureBonus: 3,
      militaryBonus: 0,
      specialAbility: '불가사의 건설 비용 -2',
    },
    color: '#F59E0B',
    flag: '🏺',
  },
  china: {
    id: 'china',
    name: '중국',
    description: '만리장성의 나라. 생산력에 보너스.',
    bonus: {
      tradeBonus: 1,
      productionBonus: 2,
      cultureBonus: 0,
      militaryBonus: 0,
      specialAbility: '성벽 건설 비용 -2',
    },
    color: '#EF4444',
    flag: '🐉',
  },
  russia: {
    id: 'russia',
    name: '러시아',
    description: '광활한 대지. 자원에 보너스.',
    bonus: {
      tradeBonus: 1,
      productionBonus: 1,
      cultureBonus: 0,
      militaryBonus: 1,
      specialAbility: '툰드라 지형 보너스 +1',
    },
    color: '#1D4ED8',
    flag: '🐻',
  },
  germany: {
    id: 'germany',
    name: '독일',
    description: '공학의 나라. 과학에 보너스.',
    bonus: {
      tradeBonus: 0,
      productionBonus: 2,
      cultureBonus: 0,
      militaryBonus: 1,
      specialAbility: '산업화 기술 연구 비용 -3',
    },
    color: '#1F2937',
    flag: '⚙️',
  },
};

export function getNation(id: NationType): Nation {
  return NATIONS[id];
}

export function getAllNations(): Nation[] {
  return Object.values(NATIONS);
}
