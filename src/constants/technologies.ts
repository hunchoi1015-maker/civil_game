import { Technology } from '../types';

// QA ver1 기준 기술 비용: 6, 11, 15, 21, 26
export const TECH_COSTS: Record<number, number> = {
  1: 6,
  2: 11,
  3: 15,
  4: 21,
  5: 26,
};

export const TECHNOLOGIES: Technology[] = [
  // Level 1 - 고대 기술 (비용: 6)
  {
    id: 'pottery',
    name: '도자기',
    level: 1,
    cost: TECH_COSTS[1],
    description: '곡물 저장과 교역의 기초',
    effects: [{ type: 'trade', value: 1, description: '교역 +1' }],
    unlocks: [],
    isResearched: false,
  },
  {
    id: 'mining',
    name: '채광',
    level: 1,
    cost: TECH_COSTS[1],
    description: '광물 자원 채굴 기술',
    effects: [{ type: 'production', value: 1, description: '생산력 +1' }],
    unlocks: [],
    isResearched: false,
  },
  {
    id: 'animal_husbandry',
    name: '목축',
    level: 1,
    cost: TECH_COSTS[1],
    description: '동물 사육과 기병의 기초',
    effects: [{ type: 'military', value: 1, description: '기병 해금' }],
    unlocks: [{ type: 'armyTier', id: 'cavalry_1', name: '경기병' }],
    isResearched: false,
  },
  {
    id: 'writing',
    name: '문자',
    level: 1,
    cost: TECH_COSTS[1],
    description: '지식의 기록과 전파',
    effects: [{ type: 'culture', value: 1, description: '문화 +1' }],
    unlocks: [{ type: 'building', id: 'library', name: '도서관' }],
    isResearched: false,
  },
  {
    id: 'sailing',
    name: '항해',
    level: 1,
    cost: TECH_COSTS[1],
    description: '물 타일 이동 가능',
    effects: [{ type: 'special', value: 1, description: '물 타일 통과' }],
    unlocks: [{ type: 'ability', id: 'water_movement', name: '물 타일 이동' }],
    isResearched: false,
  },

  // Level 2 - 고전 기술 (비용: 11)
  {
    id: 'iron_working',
    name: '철기',
    level: 2,
    cost: TECH_COSTS[2],
    description: '강력한 무기와 도구 제작',
    effects: [{ type: 'military', value: 2, description: '전투력 +2' }],
    unlocks: [{ type: 'armyTier', id: 'infantry_2', name: '검사' }],
    isResearched: false,
  },
  {
    id: 'construction',
    name: '건축',
    level: 2,
    cost: TECH_COSTS[2],
    description: '대규모 건축물 건설',
    effects: [{ type: 'production', value: 2, description: '생산력 +2' }],
    unlocks: [{ type: 'armyTier', id: 'artillery_1', name: '투석기' }],
    isResearched: false,
  },
  {
    id: 'currency',
    name: '화폐',
    level: 2,
    cost: TECH_COSTS[2],
    description: '경제 시스템의 발전',
    effects: [{ type: 'trade', value: 2, description: '교역 +2' }],
    unlocks: [{ type: 'building', id: 'market', name: '시장' }],
    isResearched: false,
  },
  {
    id: 'philosophy',
    name: '철학',
    level: 2,
    cost: TECH_COSTS[2],
    description: '사상과 문화의 발전',
    effects: [{ type: 'culture', value: 2, description: '문화 +2' }],
    unlocks: [
      { type: 'building', id: 'temple', name: '사원' },
      { type: 'building', id: 'university', name: '대학교' },
    ],
    isResearched: false,
  },

  // Level 3 - 중세 기술 (비용: 15)
  {
    id: 'chivalry',
    name: '기사도',
    level: 3,
    cost: TECH_COSTS[3],
    description: '기사와 중장기병',
    effects: [{ type: 'military', value: 3, description: '기병 강화' }],
    unlocks: [
      { type: 'armyTier', id: 'cavalry_2', name: '기사' },
      { type: 'government', id: 'monarchy', name: '군주정' },
    ],
    isResearched: false,
  },
  {
    id: 'gunpowder',
    name: '화약',
    level: 3,
    cost: TECH_COSTS[3],
    description: '화기의 발명',
    effects: [{ type: 'military', value: 3, description: '포병 강화' }],
    unlocks: [{ type: 'armyTier', id: 'artillery_2', name: '대포' }],
    isResearched: false,
  },
  {
    id: 'banking',
    name: '금융',
    level: 3,
    cost: TECH_COSTS[3],
    description: '은행과 금융 시스템',
    effects: [{ type: 'trade', value: 3, description: '화폐 생산' }],
    unlocks: [{ type: 'building', id: 'bank', name: '은행' }],
    isResearched: false,
  },
  {
    id: 'theology',
    name: '신학',
    level: 3,
    cost: TECH_COSTS[3],
    description: '종교적 권위와 문화',
    effects: [{ type: 'culture', value: 3, description: '문화 +3' }],
    unlocks: [
      { type: 'building', id: 'cathedral', name: '대성당' },
      { type: 'government', id: 'fundamentalism', name: '신정정치' },
    ],
    isResearched: false,
  },

  // Level 4 - 산업 기술 (비용: 21)
  {
    id: 'industrialization',
    name: '산업화',
    level: 4,
    cost: TECH_COSTS[4],
    description: '대량 생산의 시대',
    effects: [{ type: 'production', value: 4, description: '생산력 대폭 증가' }],
    unlocks: [
      { type: 'armyTier', id: 'infantry_3', name: '소총병' },
      { type: 'armyTier', id: 'artillery_3', name: '야포' },
      { type: 'armyTier', id: 'cavalry_3', name: '기갑병' },
      { type: 'armyTier', id: 'airforce_2', name: '전투기' },
    ],
    isResearched: false,
  },
  {
    id: 'railroad',
    name: '철도',
    level: 4,
    cost: TECH_COSTS[4],
    description: '물류와 이동의 혁명',
    effects: [{ type: 'special', value: 1, description: '이동력 +1' }],
    unlocks: [{ type: 'armyTier', id: 'airforce_1', name: '정찰기' }],
    isResearched: false,
  },
  {
    id: 'communism_tech',
    name: '공산주의 이론',
    level: 4,
    cost: TECH_COSTS[4],
    description: '새로운 정치 이념',
    effects: [{ type: 'production', value: 3, description: '생산력 +3' }],
    unlocks: [{ type: 'government', id: 'communism', name: '공산주의' }],
    isResearched: false,
  },
  {
    id: 'democracy_tech',
    name: '민주주의 이론',
    level: 4,
    cost: TECH_COSTS[4],
    description: '시민 참여 정치',
    effects: [{ type: 'trade', value: 4, description: '교역 +4' }],
    unlocks: [
      { type: 'government', id: 'democracy', name: '민주정' },
      { type: 'government', id: 'republic', name: '공화정' },
      { type: 'armyTier', id: 'airforce_3', name: '폭격기' },
    ],
    isResearched: false,
  },

  // Level 5 - 현대/미래 기술 (비용: 26, 승리 조건)
  {
    id: 'space_flight',
    name: '우주 비행',
    level: 5,
    cost: TECH_COSTS[5],
    description: '우주 시대의 개막 - 과학 승리!',
    effects: [{ type: 'special', value: 0, description: '과학 승리 달성' }],
    unlocks: [{ type: 'ability', id: 'science_victory', name: '과학 승리' }],
    isResearched: false,
  },
  {
    id: 'advanced_flight',
    name: '항공 기술',
    level: 5,
    cost: TECH_COSTS[5],
    description: '공군의 완성',
    effects: [{ type: 'military', value: 5, description: '공군 Tier 4 해금' }],
    unlocks: [
      { type: 'armyTier', id: 'infantry_4', name: '현대 보병' },
      { type: 'armyTier', id: 'airforce_4', name: '스텔스기' },
    ],
    isResearched: false,
  },
  {
    id: 'nuclear_power',
    name: '원자력',
    level: 5,
    cost: TECH_COSTS[5],
    description: '무한한 에너지원',
    effects: [{ type: 'production', value: 5, description: '생산력 +5' }],
    unlocks: [
      { type: 'armyTier', id: 'artillery_4', name: '로켓포' },
      { type: 'armyTier', id: 'cavalry_4', name: '전차' },
    ],
    isResearched: false,
  },
  {
    id: 'globalization',
    name: '세계화',
    level: 5,
    cost: TECH_COSTS[5],
    description: '글로벌 경제 네트워크',
    effects: [{ type: 'trade', value: 5, description: '교역 +5' }],
    unlocks: [{ type: 'ability', id: 'global_trade', name: '글로벌 교역' }],
    isResearched: false,
  },
];

export function getTechById(id: string): Technology | undefined {
  return TECHNOLOGIES.find(t => t.id === id);
}

export function getTechsByLevel(level: number): Technology[] {
  return TECHNOLOGIES.filter(t => t.level === level);
}

// 피라미드 제약 확인: 상위 레벨 기술 연구를 위해 하위 레벨 기술이 필요
export function canResearchTech(techId: string, researchedTechs: string[]): boolean {
  const tech = getTechById(techId);
  if (!tech) return false;
  if (tech.isResearched) return false;

  // 레벨 1은 바로 연구 가능
  if (tech.level === 1) return true;

  // 상위 레벨: 바로 아래 레벨의 기술 중 최소 1개 이상 연구 필요
  const lowerLevelTechs = getTechsByLevel(tech.level - 1);
  const researchedLowerLevel = lowerLevelTechs.filter(t =>
    researchedTechs.includes(t.id)
  );

  // 피라미드: N레벨 연구를 위해 (N-1)레벨 기술 N-1개 이상 필요
  return researchedLowerLevel.length >= tech.level - 1;
}

// 기술 비용 계산 (건물 보너스 적용)
export function calculateTechCost(tech: Technology, techCostReduction: number): number {
  return Math.max(1, tech.cost - techCostReduction);
}
