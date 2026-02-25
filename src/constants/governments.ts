import { GovernmentType } from '../types';

export interface GovernmentDefinition {
  type: GovernmentType;
  name: string;
  description: string;
  requiredTech: string | null;
}

export const GOVERNMENTS: Record<GovernmentType, GovernmentDefinition> = {
  despotism: {
    type: 'despotism',
    name: '전제정치',
    description: '기본 체제입니다. 특별한 능력이나 페널티가 없습니다.',
    requiredTech: null,
  },
  republic: {
    type: 'republic',
    name: '공화제',
    description: '개척자로 오두막을 탐사할 수 있습니다. 군사 유닛으로 도시를 건설할 수 있습니다.',
    requiredTech: 'code_of_laws', // 법계
  },
  monarchy: {
    type: 'monarchy',
    name: '군주제',
    description: '수도에서 문화 수확 시 문화 +1. 문화 이벤트 카드 보유 제한 +1.',
    requiredTech: 'monarchy', // 군주제
  },
  democracy: {
    type: 'democracy',
    name: '민주주의',
    description: '교역 단계에서 교역 자원을 추가로 +2 얻습니다. 다른 도시를 공격할 수 없습니다.',
    requiredTech: 'democracy', // 민주주의
  },
  feudalism: {
    type: 'feudalism',
    name: '봉건제',
    description: '채택 시 화폐 +1. (해제 시 화폐 -1) 도시 행동력을 소모해 내 다른 도시의 사치 자원을 원격 수확할 수 있습니다.',
    requiredTech: 'chivalry', // 기사도
  },
  communism: {
    type: 'communism',
    name: '공산주의',
    description: '모든 도시에서 생산력을 추가로 +2 얻습니다. 수도에서 문화 수확 시 문화를 -1 덜 받습니다.',
    requiredTech: 'communism', // 공산주의
  },
  fundamentalism: {
    type: 'fundamentalism',
    name: '근본주의',
    description: '전투 시 부대 카드 사용 가능 횟수가 +1 증가합니다. 교역 단계에서 교역을 -2 덜 얻습니다.',
    requiredTech: 'theology', // 신학
  },
  anarchy: {
    type: 'anarchy',
    name: '무정부',
    description: '[페널티] 수도에서 아무런 생산 및 행동을 할 수 없습니다. (다음 턴에 다른 체제로 변경 가능)',
    requiredTech: null,
  },
};

// 해금된 정치체제 목록을 불러오는 함수 (무정부는 목록에서 제외하여 특수 처리)
export function getAvailableGovernments(researchedTechs: string[]): GovernmentDefinition[] {
  return Object.values(GOVERNMENTS).filter(
    gov => gov.type !== 'anarchy' && (gov.requiredTech === null || researchedTechs.includes(gov.requiredTech))
  );
}

export function getGovernmentDefinition(type: GovernmentType): GovernmentDefinition {
  return GOVERNMENTS[type];
}