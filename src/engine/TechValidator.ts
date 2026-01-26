import { Technology, TechLevel, TECH_PYRAMID_REQUIREMENTS } from '../types';
import { TECHNOLOGIES, getTechById } from '../constants/technologies';

export interface TechValidationResult {
  isValid: boolean;
  reason?: string;
  missingRequirements?: string[];
}

export function validateTechResearch(
  techId: string,
  researchedTechs: Technology[],
  availableTrade: number
): TechValidationResult {
  const tech = getTechById(techId);

  if (!tech) {
    return {
      isValid: false,
      reason: '존재하지 않는 기술입니다.',
    };
  }

  // 이미 연구했는지 확인
  if (researchedTechs.some((t) => t.id === techId)) {
    return {
      isValid: false,
      reason: '이미 연구한 기술입니다.',
    };
  }

  // 비용 확인
  if (availableTrade < tech.cost) {
    return {
      isValid: false,
      reason: `교역 토큰이 부족합니다. (필요: ${tech.cost}, 보유: ${availableTrade})`,
    };
  }

  // 피라미드 제약 확인
  if (tech.level > 1) {
    const techCounts = countTechsByLevel(researchedTechs);
    const requiredCount = TECH_PYRAMID_REQUIREMENTS[tech.level];
    const previousLevel = (tech.level - 1) as TechLevel;

    if (techCounts[previousLevel] < requiredCount) {
      return {
        isValid: false,
        reason: `${previousLevel}단계 기술을 ${requiredCount}개 이상 연구해야 합니다. (현재: ${techCounts[previousLevel]}개)`,
        missingRequirements: [`${previousLevel}단계 기술 ${requiredCount - techCounts[previousLevel]}개 추가 필요`],
      };
    }
  }

  return { isValid: true };
}

export function countTechsByLevel(techs: Technology[]): Record<TechLevel, number> {
  const counts: Record<TechLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const tech of techs) {
    counts[tech.level]++;
  }

  return counts;
}

export function getAvailableTechs(researchedTechs: Technology[]): Technology[] {
  const researchedIds = new Set(researchedTechs.map((t) => t.id));
  const techCounts = countTechsByLevel(researchedTechs);

  return TECHNOLOGIES.filter((tech) => {
    // 이미 연구했으면 제외
    if (researchedIds.has(tech.id)) return false;

    // 피라미드 제약 확인
    if (tech.level > 1) {
      const requiredCount = TECH_PYRAMID_REQUIREMENTS[tech.level];
      const previousLevel = (tech.level - 1) as TechLevel;
      if (techCounts[previousLevel] < requiredCount) return false;
    }

    return true;
  });
}

export function getTechTreeProgress(researchedTechs: Technology[]): {
  level: TechLevel;
  count: number;
  maxCount: number;
  canUnlockNext: boolean;
}[] {
  const counts = countTechsByLevel(researchedTechs);

  return [1, 2, 3, 4, 5].map((level) => {
    const techLevel = level as TechLevel;
    const maxTechs = TECHNOLOGIES.filter((t) => t.level === techLevel).length;
    const nextLevel = (level + 1) as TechLevel;
    const requiredForNext = level < 5 ? TECH_PYRAMID_REQUIREMENTS[nextLevel] : 0;

    return {
      level: techLevel,
      count: counts[techLevel],
      maxCount: maxTechs,
      canUnlockNext: level < 5 && counts[techLevel] >= requiredForNext,
    };
  });
}

export function checkScienceVictory(researchedTechs: Technology[]): boolean {
  return researchedTechs.some((tech) => tech.id === 'space_flight');
}
