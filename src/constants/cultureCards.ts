// src/constants/cultureCards.ts

import { CultureCardTemplate } from '../types/cultureCard';

export const CULTURE_CARD_TEMPLATES: Record<string, CultureCardTemplate> = {
  exile: {
    id: 'exile',
    level: 1,
    name: '망명',
    description: '도시 경영 단계에서 상대 유닛 1개를 선택해 2칸 이내의 빈 곳으로 물러나게 합니다. (대각선/물/전투타일 불가)',
    targetType: 'enemy_unit',
  },
  dictators_day: {
    id: 'dictators_day',
    level: 1,
    name: '독재자의 날',
    description: '이번 턴에 내 도시 1개의 생산력을 +4합니다.',
    targetType: 'my_city',
  },
  idea_share: {
    id: 'idea_share',
    level: 1,
    name: '발상의 공유',
    description: '상대의 1단계 기술 1개를 배우고, 나의 1단계 기술 1개를 무작위로 넘겨줍니다.',
    targetType: 'none',
  },
  // 🌟 [신규 추가 카드들]
  gift_from_afar_1: {
    id: 'gift_from_afar_1',
    level: 1,
    name: '멀리서 온 선물 (A)',
    description: '이 카드를 [철, 비단, 밀, 향료] 중 하나로 일회성 사용(비밀 자원 획득)합니다. 그 후 다른 플레이어를 지목해 화폐 1개를 줍니다.',
    targetType: 'player'
  },
  gift_from_afar_2: {
    id: 'gift_from_afar_2',
    level: 1,
    name: '멀리서 온 선물 (B)',
    description: '이 카드를 [철, 비단, 향료, 스파이] 중 하나로 일회성 사용(비밀 자원 획득)합니다. 그 후 다른 플레이어를 지목해 화폐 1개를 줍니다.',
    targetType: 'player',
  },
  gift_from_afar_3: {
    id: 'gift_from_afar_3',
    level: 1,
    name: '멀리서 온 선물 (C)',
    description: '이 카드를 [비단, 밀, 향료, 스파이] 중 하나로 일회성 사용(비밀 자원 획득)합니다. 그 후 다른 플레이어를 지목해 화폐 1개를 줍니다.',
    targetType: 'player',
  },
  drought: {
    id: 'drought',
    level: 1,
    name: '가뭄',
    description: '산, 도시, 건물, 불가사의가 없는 칸 하나를 영구히 사막으로 만듭니다. (해당 칸의 자원/마커 증발)',
    targetType: 'tile',
  },
  confusion: {
    id: 'confusion',
    level: 1,
    name: '혼란',
    description: '내 유닛이나 도시에서 4칸 이내에 있는 상대 유닛 1개를 제거합니다.',
    targetType: 'enemy_unit_in_range',
  },
  sabotage: {
    id: 'sabotage',
    level: 1,
    name: '사보타주',
    description: '내 유닛이나 도시에서 4칸 이내에 있는 상대 도시의 건물(성벽 포함) 1개를 파괴합니다.',
    targetType: 'enemy_city_in_range',
  },
  bread_and_circuses: {
    id: 'bread_and_circuses',
    level: 1,
    name: '빵과 서커스',
    description: '나를 향한 문화 이벤트 1개를 즉시 무효화합니다. (개입 방어 창에서 즉시 사용 가능)',
    targetType: 'none', 
  },
  civil_uprising: {
    id: 'civil_uprising',
    level: 1,
    name: '시민 봉기',
    description: '플레이어 1명을 선택해 즉시 정치체제를 무정부 상태로 만들고, 다음 턴 1회 동안 체제 변경을 막습니다.',
    targetType: 'player',
  }
};