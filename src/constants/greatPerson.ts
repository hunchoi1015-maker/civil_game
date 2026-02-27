import { GreatPerson, GreatPersonType } from '../types/greatPerson';

// 스탯이 없는 곳은 0으로 처리하여 계산기에서 편하게 더할 수 있도록 세팅
export const GREAT_PEOPLE_DATA: Record<GreatPersonType, Omit<GreatPerson, 'id'>> = {
  artist: { type: 'artist', name: 'basic', description: '"예술은 영혼을 살찌우는 양식이다."', stats: { culture: 2, trade: 1, production: 0, currency: 0, combatBonus: 0 } },
  inventor: { type: 'inventor', name: 'basic', description: '"유레카! 새로운 원리를 발견했어!"', stats: { culture: 0, trade: 0, production: 2, currency: 1, combatBonus: 0 } },
  general: { type: 'general', name: 'basic', description: '"나를 따르라! 승리는 우리의 것이다!"', stats: { culture: 0, trade: 0, production: 0, currency: 0, combatBonus: 4 } },
  humanitarian: { type: 'humanitarian', name: 'basic', description: '"모든 인간은 평등하며 존엄하다."', stats: { culture: 1, trade: 1, production: 1, currency: 1, combatBonus: 0 } },
  explorer: { type: 'explorer', name: 'basic', description: '"저 지도 너머에는 무엇이 있을까?"', stats: { culture: 2, trade: 0, production: 0, currency: 1, combatBonus: 0 } },
  scientist: { type: 'scientist', name: 'basic', description: '"자연의 법칙은 절대 거짓말을 하지 않지."', stats: { culture: 0, trade: 2, production: 1, currency: 0, combatBonus: 0 } },
};

// 🌟 랜덤 위인 뽑기 함수
export function drawRandomGreatPerson(): GreatPerson {
  const types: GreatPersonType[] = ['artist', 'inventor', 'general', 'humanitarian', 'explorer', 'scientist'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const data = GREAT_PEOPLE_DATA[randomType];

  return {
    ...data,
    id: `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}