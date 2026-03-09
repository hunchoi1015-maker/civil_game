// src/constants/cultureCards.ts 

import { CultureCardTemplate } from '../types/cultureCard';

export const CULTURE_CARD_TEMPLATES: Record<string, CultureCardTemplate> = {
  exile: {
    id: 'exile',
    level: 1,
    name: '망명',
    description: '도시 경영 단계에서 상대 유닛 1개를 선택해 2칸 이내의 빈 곳으로 물러나게 합니다.',
    targetType: 'enemy_unit',
    allowedPhase: 'cityManagement', // 🌟 도시 경영
  },
  dictators_day: {
    id: 'dictators_day',
    level: 1,
    name: '독재자의 날',
    description: '이번 턴에 내 도시 1개의 생산력을 +4합니다.',
    targetType: 'my_city',
    allowedPhase: 'cityManagement', // 🌟 도시 경영
  },
  idea_share: {
    id: 'idea_share',
    level: 1,
    name: '발상의 공유',
    description: '상대의 1단계 기술 1개를 배우고, 나의 1단계 기술 1개를 무작위로 넘겨줍니다.',
    targetType: 'player',
    allowedPhase: 'start', // 🌟 차례 시작
  },
  gift_from_afar_1: {
    id: 'gift_from_afar_1',
    level: 1,
    name: '멀리서 온 선물 (A)',
    description: '이 카드를 [철, 비단, 밀, 향료] 중 하나로 일회성 사용합니다. 그 후 다른 플레이어에게 화폐 1개를 줍니다.',
    targetType: 'player',
    allowedPhase: 'any', // 🌟 언제든
  },
  gift_from_afar_2: {
    id: 'gift_from_afar_2',
    level: 1,
    name: '멀리서 온 선물 (B)',
    description: '이 카드를 [철, 비단, 향료, 스파이] 중 하나로 일회성 사용합니다. 그 후 다른 플레이어에게 화폐 1개를 줍니다.',
    targetType: 'player',
    allowedPhase: 'any', // 🌟 언제든
  },
  gift_from_afar_3: {
    id: 'gift_from_afar_3',
    level: 1,
    name: '멀리서 온 선물 (C)',
    description: '이 카드를 [비단, 밀, 향료, 스파이] 중 하나로 일회성 사용합니다. 그 후 다른 플레이어에게 화폐 1개를 줍니다.',
    targetType: 'player',
    allowedPhase: 'any', // 🌟 언제든
  },
  drought: {
    id: 'drought',
    level: 1,
    name: '가뭄',
    description: '산, 도시, 건물, 불가사의가 없는 칸 하나를 영구히 사막으로 만듭니다.',
    targetType: 'tile',
    allowedPhase: 'start', // 🌟 차례 시작
  },
  confusion: {
    id: 'confusion',
    level: 1,
    name: '혼란',
    description: '내 유닛이나 도시에서 4칸 이내에 있는 상대 유닛 1개를 제거합니다.',
    targetType: 'enemy_unit_in_range',
    allowedPhase: 'movement', // 🌟 이동
  },
  sabotage: {
    id: 'sabotage',
    level: 1,
    name: '사보타주',
    description: '내 유닛이나 도시에서 4칸 이내에 있는 상대 도시의 건물(성벽 포함) 1개를 파괴합니다.',
    targetType: 'enemy_city_in_range',
    allowedPhase: 'start', // 🌟 차례 시작
  },
  bread_and_circuses: {
    id: 'bread_and_circuses',
    level: 1,
    name: '빵과 서커스',
    description: '나를 향한 문화 이벤트 1개를 즉시 무효화합니다. (개입 방어 창에서 즉시 사용 가능)',
    targetType: 'none', 
    allowedPhase: 'any', // 🌟 언제든 (하지만 실제론 개입 창에서만 쓰임)
  },
  civil_uprising: {
    id: 'civil_uprising',
    level: 1,
    name: '시민 봉기',
    description: '플레이어 1명을 선택해 즉시 정치체제를 무정부 상태로 만들고, 다음 턴 1회 동안 체제 변경을 막습니다.',
    targetType: 'player',
    allowedPhase: 'start', // 🌟 차례 시작
  },
//{/*  2단계  */}
queens_day: {
    id: 'queens_day',
    level: 2,
    name: '여왕의 날',
    description: '이번 차례에 내 도시 1곳의 생산력(노동력)이 +6 증가합니다.',
    targetType: 'my_city',
    allowedPhase: 'cityManagement',
  },
  bountiful_gift: {
    id: 'bountiful_gift',
    level: 2,
    name: '풍족한 선물',
    description: '이 카드를 [철, 비단, 밀, 향료, 스파이] 중 하나로 일회성 사용(비밀 자원 획득)합니다.',
    targetType: 'self_resource',
    allowedPhase: 'any',
  },
  deforestation: {
    id: 'deforestation',
    level: 2,
    name: '산림 벌채',
    description: '건물이나 불가사의가 없는 숲 칸 1개를 초원으로 만듭니다. (자원/마커 유지)',
    targetType: 'tile',
    allowedPhase: 'start',
  },
  knowledge_sharing: {
    id: 'knowledge_sharing',
    level: 2,
    name: '지식 공유',
    description: '상대를 지정해 1~2단계 기술 1개를 빼앗아 공짜로 배우고, 내 1~2단계 기술 1개가 무작위로 넘어갑니다.',
    targetType: 'player', // (발상의 공유와 동일한 UI 사용)
    allowedPhase: 'start',
  },
  disappearance: {
    id: 'disappearance',
    level: 2,
    name: '실종',
    description: '상대방 유닛이 있는 칸을 선택해, 해당 칸의 모든 상대 유닛을 최대 3칸 이내의 빈 곳으로 물러나게 합니다.',
    targetType: 'enemy_unit_group',
    allowedPhase: 'cityManagement',
  },
  mass_exile: {
    id: 'mass_exile',
    level: 2,
    name: '집단 망명',
    description: '내 유닛이나 도시에서 6칸 이내에 있는 상대 유닛/위인을 최대 2개까지 제거합니다.',
    targetType: 'up_to_two_enemy_units_in_range',
    allowedPhase: 'movement',
  },
  disaster: {
    id: 'disaster',
    level: 2,
    name: '재앙',
    description: '내 유닛이나 도시에서 6칸 이내에 있는 상대 도시의 건물(성벽 포함) 1개를 파괴합니다.',
    targetType: 'enemy_city_in_range',
    allowedPhase: 'start',
  },
  jousting: {
    id: 'jousting',
    level: 2,
    name: '마상시합',
    description: '아무 문화 이벤트 1개를 즉시 무효화합니다. (자신을 향한 공격이 아니어도 개입 방어 창에서 사용 가능)',
    targetType: 'none', 
    allowedPhase: 'any',
  },

  // ==========================================
  // 🌟 [3단계 문화 이벤트 카드]
  // ==========================================
  presidents_day: {
    id: 'presidents_day', level: 3, name: '대통령의 날', 
    description: '이번 차례에 내 도시 1곳의 생산력(노동력)이 +8 증가합니다.', 
    targetType: 'my_city', allowedPhase: 'cityManagement'
  },
  noble_gift: {
    id: 'noble_gift', level: 3, name: '고귀한 선물', 
    description: '이 카드를 [철, 밀, 비단, 향료, 스파이, 우라늄] 중 하나로 일회성 사용(비밀 자원 획득)합니다.', 
    targetType: 'self_resource', allowedPhase: 'any'
  },
  think_tank: {
    id: 'think_tank', level: 3, name: '싱크탱크', 
    description: '상대를 지정해 1~3단계 기술 1개를 공짜로 배우고, 내 1~3단계 기술 1개가 무작위로 넘어갑니다.', 
    targetType: 'player', allowedPhase: 'start'
  },
  command_collapse: {
    id: 'command_collapse', level: 3, name: '지휘권 붕괴', 
    description: '상대방 유닛이 있는 칸을 선택해, 해당 칸의 모든 상대 유닛을 최대 4칸 이내의 빈 곳으로 물러나게 합니다.', 
    targetType: 'enemy_unit_group', allowedPhase: 'cityManagement'
  },
  mass_asylum: {
    id: 'mass_asylum', level: 3, name: '대규모 망명', 
    description: '맵 전체에서 칸을 클릭해 유닛이나 위인을 최대 2개까지 제거합니다. (맵을 직접 클릭하세요)', 
    targetType: 'map_up_to_two', allowedPhase: 'movement'
  },
  cataclysm: {
    id: 'cataclysm', level: 3, name: '대재앙', 
    description: '맵 전체에서 다른 사람의 건물(성벽 포함)을 최대 2개까지 클릭해 파괴합니다.', 
    targetType: 'map_up_to_two', allowedPhase: 'start'
  },
  prime_time_tv: {
    id: 'prime_time_tv', level: 3, name: '황금시간대 TV', 
    description: '문화 이벤트나 자원 능력 1개를 무조건 취소시킵니다. (자원 능력을 막아도 사용된 자원은 반환되지 않음)', 
    targetType: 'none', allowedPhase: 'any'
  }

};