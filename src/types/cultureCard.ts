export type CultureCardTargetType = 'enemy_unit' | 'my_city' | 'none';

export interface CultureEventCard {
  id: string;          // 카드 인스턴스의 고유 ID (uuid)
  templateId: string;  // 카드 템플릿 ID (종류)
  level: 1 | 2 | 3;
  name: string;
  description: string;
  targetType: CultureCardTargetType;
}

export interface CultureCardTemplate {
  id: string;
  level: 1 | 2 | 3;
  name: string;
  description: string;
  targetType: CultureCardTargetType;
}