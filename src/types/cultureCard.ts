export type CultureCardTargetType = 
  | 'enemy_unit' 
  | 'my_city' 
  | 'none'
  | 'player'               // 👈 신규 (시민 봉기, 멀리서 온 선물)
  | 'tile'                 // 👈 신규 (가뭄)
  | 'enemy_unit_in_range'  // 👈 신규 (혼란)
  | 'enemy_city_in_range' // 👈 신규 (사보타주)
  | 'self_resource'                   // 🌟 신규: 풍족한 선물 (나만 자원 획득)
  | 'enemy_unit_group'                // 🌟 신규: 실종 (해당 타일의 유닛 무리 전체)
  | 'up_to_two_enemy_units_in_range'
  | 'map_up_to_two';


export type CultureCardAllowedPhase = 'start' | 'trade' | 'cityManagement' | 'movement' | 'research' | 'any';

export interface CultureEventCard {
  id: string;          
  templateId: string;  
  level: 1 | 2 | 3;
  name: string;
  description: string;
  targetType: CultureCardTargetType;
  allowedPhase: CultureCardAllowedPhase; // 🌟 [추가]
}

export interface CultureCardTemplate {
  id: string;
  level: 1 | 2 | 3;
  name: string;
  description: string;
  targetType: CultureCardTargetType;
  allowedPhase: CultureCardAllowedPhase; // 🌟 [추가]
}