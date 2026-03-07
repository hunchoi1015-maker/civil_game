// src/types/wonder.ts

export type WonderType = 
  | 'pyramids' | 'colossus' | 'hanging_gardens' | 'stonehenge' | 'oracle' // 고대
  | 'louvre' | 'himeji_castle' | 'porcelain_tower' | 'angkor_wat' // 중세
  | 'un' | 'statue_of_liberty' | 'sydney_opera_house' | 'panama_canal'; // 현대

export type WonderEra = 'ancient' | 'medieval' | 'modern';

export interface WonderDefinition {
  type: WonderType;
  name: string;
  cost: number; 
  cultureProduction: number; 
  description: string;
  era: WonderEra;
  costReductionTech?: string; 
  costReductionAmount?: number; 
}

export const WONDERS: Record<WonderType, WonderDefinition> = {
  // === 고대 불가사의 ===
  colossus: {
    type: 'colossus', name: '거신상', cost: 3, cultureProduction: 1,
    description: '고대 불가사의. 차례 시작: 교역 3 획득 (금속가공 보유 시 생산력 5 감소)',
    era: 'ancient', costReductionTech: 'metal_casting', costReductionAmount: 5,
  },
  hanging_gardens: {
    type: 'hanging_gardens', name: '공중정원', cost: 3, cultureProduction: 1,
    description: '고대 불가사의. 차례 시작: 타일에 무료 기병 1기 배치 (축산 보유 시 생산력 5 감소)',
    era: 'ancient', costReductionTech: 'animal_husbandry', costReductionAmount: 5,
  },
  stonehenge: {
    type: 'stonehenge', name: '스톤헨지', cost: 3, cultureProduction: 1,
    description: '고대 불가사의. 차례 시작: 문화 1 획득', era: 'ancient',
  },
  oracle: {
    type: 'oracle', name: '신탁', cost: 3, cultureProduction: 1,
    description: '고대 불가사의. 전투 시: 상대방의 손패 모두 공개 (법계 보유 시 생산력 5 감소)',
    era: 'ancient', costReductionTech: 'code_of_laws', costReductionAmount: 5,
  },
  pyramids: {
    type: 'pyramids', name: '피라미드', cost: 3, cultureProduction: 1,
    description: '고대 불가사의. 모든 정치체제 해제 및 무정부 면역 (도자기 보유 시 생산력 5 감소)',
    era: 'ancient', costReductionTech: 'pottery', costReductionAmount: 5,
  },

  // === 중세 불가사의 ===
  louvre: {
    type: 'louvre', name: '루브르 박물관', cost: 4, cultureProduction: 2,
    description: '중세 불가사의. 차례 시작: 문화 3 획득 (인쇄기 보유 시 생산력 5 감소)',
    era: 'medieval', costReductionTech: 'printing_press', costReductionAmount: 5,
  },
  himeji_castle: {
    type: 'himeji_castle', name: '히메지성', cost: 4, cultureProduction: 2,
    description: '중세 불가사의. 전투 시: 자기 부대 카드의 공격력 +1, 체력 +1 (군주제 보유 시 생산력 5 감소)',
    era: 'medieval', costReductionTech: 'monarchy', costReductionAmount: 5,
  },
  porcelain_tower: {
    type: 'porcelain_tower', name: '자기탑', cost: 4, cultureProduction: 2,
    description: '중세 불가사의. 기술 개발 시 교역 5 할인 (건설 보유 시 생산력 5 감소)',
    era: 'medieval', costReductionTech: 'construction', costReductionAmount: 5,
  },
  angkor_wat: {
    type: 'angkor_wat', name: '앙코르와트', cost: 4, cultureProduction: 2,
    description: '중세 불가사의. 매 턴 자원 수확 시 특별 보너스 (철학 보유 시 생산력 5 감소)',
    era: 'medieval', costReductionTech: 'philosophy', costReductionAmount: 5,
  },

  // === 현대 불가사의 ===
  un: {
    type: 'un', name: '국제연합', cost: 5, cultureProduction: 3,
    description: '현대 불가사의. 언제든: 원하지 않는 문화 이벤트 방어', era: 'modern',
  },
  statue_of_liberty: {
    type: 'statue_of_liberty', name: '자유의 여신상', cost: 5, cultureProduction: 3,
    description: '현대 불가사의. 차례 시작: 상대방 기술 1개 무료 획득 (금속 주조 보유 시 생산력 5 감소)',
    era: 'modern', costReductionTech: 'metal_casting', costReductionAmount: 5,
  },
  sydney_opera_house: {
    type: 'sydney_opera_house', name: '시드니 오페라 하우스', cost: 5, cultureProduction: 3,
    description: '현대 불가사의. 차례 시작: 문화 트랙 1칸 무료 전진', era: 'modern',
  },
  panama_canal: {
    type: 'panama_canal', name: '파나마 운하', cost: 5, cultureProduction: 3,
    description: '현대 불가사의. 차례 시작: 화폐 1 획득 (공학 보유 시 생산력 5 감소)',
    era: 'modern', costReductionTech: 'engineering', costReductionAmount: 5,
  },
};