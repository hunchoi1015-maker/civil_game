export type CultureCardTargetType = 
  | 'enemy_unit' 
  | 'my_city' 
  | 'none'
  | 'player'               // 👈 신규 (시민 봉기, 멀리서 온 선물)
  | 'tile'                 // 👈 신규 (가뭄)
  | 'enemy_unit_in_range'  // 👈 신규 (혼란)
  | 'enemy_city_in_range'; // 👈 신규 (사보타주)

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