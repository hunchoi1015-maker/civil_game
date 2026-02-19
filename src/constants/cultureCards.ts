import { CultureCardTemplate } from '../types/cultureCard';

export const CULTURE_CARD_TEMPLATES: Record<string, CultureCardTemplate> = {
  exile: {
    id: 'exile',
    level: 1,
    name: '망명',
    description: '도시 경영 단계에서 상대 유닛 1개를 선택해 4칸 이내의 빈 곳으로 물러나게 합니다.',
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
};