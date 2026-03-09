import { Technology, TechLevel, PlayerTechnology } from '../types/tech'; 
import { TECHNOLOGIES } from '../constants/technologies';
import { getEffectiveTechLevel } from '../store/helpers/validationHelpers'; // 🌟 추가

export interface TechValidationResult {
  isValid: boolean;
  reason?: string;
  missingRequirements?: string[];
}

export function getTechById(techId: string): Technology | undefined {
  return TECHNOLOGIES.find(t => t.id === techId);
}

// 🌟 [수정] 중복 코드를 지우고 통합 헬퍼를 호출합니다!
export function getPyramidLevel(techId: string, playerNation?: string): TechLevel {
  return getEffectiveTechLevel(playerNation, techId) as TechLevel;
}

export function countTechsByLevel(techs: (Technology | PlayerTechnology)[], playerNation?: string): Record<TechLevel, number> {
  const counts: Record<TechLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const tech of techs) {
    const pLevel = getPyramidLevel(tech.id, playerNation);
    counts[pLevel] = (counts[pLevel] || 0) + 1;
  }
  return counts;
}

// 🌟 변경점: playerNation을 파라미터로 추가로 받습니다.
export function validateTechResearch(
  techId: string,
  researchedTechs: (Technology | PlayerTechnology)[],
  availableTrade?: number, 
  playerNation?: string
): TechValidationResult {
  const tech = getTechById(techId);
  if (!tech) return { isValid: false };
  if (researchedTechs.some((t) => t.id === techId)) return { isValid: false, reason: '이미 연구한 기술' };

  const targetPyramidLevel = getPyramidLevel(techId, playerNation);
  
  if (targetPyramidLevel > 1) {
    const counts = countTechsByLevel(researchedTechs, playerNation);
    const requiredLowerCount = counts[(targetPyramidLevel - 1) as TechLevel] || 0;
    const currentTargetCount = counts[targetPyramidLevel] || 0;

    // 🌟 수정: 하위 기술은 (현재 목표 레벨 기술 수 + 2)개 이상 있어야 합니다!
    if (requiredLowerCount < currentTargetCount + 2) {
      return {
        isValid: false,
        reason: `피라미드 조건 부족: ${targetPyramidLevel}레벨 기술을 연구하려면 ${targetPyramidLevel - 1}레벨 기술이 최소 ${currentTargetCount + 2}개 필요합니다. (현재 ${requiredLowerCount}개)`,
      };
    }
  }

  return { isValid: true };
}

export function getAvailableTechs(researchedTechs: (Technology | PlayerTechnology)[], playerNation?: string): Technology[] {
  return TECHNOLOGIES.filter((tech) => {
    const val = validateTechResearch(tech.id, researchedTechs, 0, playerNation);
    return val.isValid;
  });
}

export function getTechTreeProgress(researchedTechs: (Technology | PlayerTechnology)[], playerNation?: string) {
  const counts = countTechsByLevel(researchedTechs, playerNation);

  return [1, 2, 3, 4, 5].map((levelNumber) => {
    const level = levelNumber as TechLevel;
    const maxTechs = TECHNOLOGIES.filter((t) => getPyramidLevel(t.id, playerNation) === level).length;
    const currentCount = counts[level] || 0;
    const nextLevelCount = counts[(level + 1) as TechLevel] || 0;
    
    // 🌟 수정: 현재 레벨 개수가 (다음 레벨 개수 + 1)보다 커야 다음 레벨을 해금할 수 있음
    const canUnlockNext = level < 5 && (currentCount > nextLevelCount + 1);

    return { level, count: currentCount, maxCount: maxTechs, canUnlockNext };
  });
}

export function checkScienceVictory(researchedTechs: (Technology | PlayerTechnology)[]): boolean {
  return researchedTechs.some((tech) => tech.id === 'space_flight');
}