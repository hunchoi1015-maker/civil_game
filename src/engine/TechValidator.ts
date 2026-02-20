// 🌟 예전 수동 import들을 지우고, 새 경로(types/tech)에 맞춘 깔끔한 import
import { Technology, TechLevel, PlayerTechnology } from '../types/tech'; 
import { TECHNOLOGIES } from '../constants/technologies';

export interface TechValidationResult {
  isValid: boolean;
  reason?: string;
  missingRequirements?: string[];
}

// 🌟 에러가 났던 getTechById 함수를 여기서 직접 정의합니다!
export function getTechById(techId: string): Technology | undefined {
  return TECHNOLOGIES.find(t => t.id === techId);
}

// 피라미드 레벨 판독기 (고유 시작 기술은 무조건 1레벨 취급)
export function getPyramidLevel(techId: string): TechLevel {
  const def = getTechById(techId);
  if (!def) return 1;
  if (def.isStartingTechFor) return 1;
  return def.level as TechLevel;
}

// 보유 기술을 '피라미드 레벨' 기준으로 개수 세기
export function countTechsByLevel(techs: (Technology | PlayerTechnology)[]): Record<TechLevel, number> {
  const counts: Record<TechLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const tech of techs) {
    const pLevel = getPyramidLevel(tech.id);
    counts[pLevel] = (counts[pLevel] || 0) + 1;
  }
  return counts;
}

// 기술 연구 가능 여부 검증 (핵심 공식 적용)
export function validateTechResearch(
  techId: string,
  researchedTechs: (Technology | PlayerTechnology)[],
  availableTrade?: number // 당장 cost가 없으므로 옵셔널 처리
): TechValidationResult {
  const tech = getTechById(techId);

  if (!tech) {
    return { isValid: false, reason: '존재하지 않는 기술입니다.' };
  }

  // 이미 연구했는지 확인
  if (researchedTechs.some((t) => t.id === techId)) {
    return { isValid: false, reason: '이미 연구한 기술입니다.' };
  }

  // 피라미드 제약 확인 (새로운 공식: N레벨 연구하려면 N-1레벨 보유 수가 N레벨 보유 수보다 커야 함)
  const targetPyramidLevel = getPyramidLevel(techId);
  
  if (targetPyramidLevel > 1) {
    const counts = countTechsByLevel(researchedTechs);
    const requiredLowerCount = counts[(targetPyramidLevel - 1) as TechLevel] || 0;
    const currentTargetCount = counts[targetPyramidLevel] || 0;

    if (requiredLowerCount <= currentTargetCount) {
      return {
        isValid: false,
        reason: `피라미드 조건 부족: ${targetPyramidLevel}레벨 기술을 추가하려면 ${targetPyramidLevel - 1}레벨 기술이 더 필요합니다.`,
        missingRequirements: [`${targetPyramidLevel - 1}레벨 기술 1개 추가 필요`],
      };
    }
  }

  return { isValid: true };
}

// 현재 연구 가능한 기술 목록 필터링
export function getAvailableTechs(researchedTechs: (Technology | PlayerTechnology)[]): Technology[] {
  return TECHNOLOGIES.filter((tech) => {
    const val = validateTechResearch(tech.id, researchedTechs);
    return val.isValid;
  });
}

// 기술 트리 화면에 보여줄 진척도 계산
export function getTechTreeProgress(researchedTechs: (Technology | PlayerTechnology)[]): {
  level: TechLevel;
  count: number;
  maxCount: number;
  canUnlockNext: boolean;
}[] {
  const counts = countTechsByLevel(researchedTechs);

  return [1, 2, 3, 4, 5].map((levelNumber) => {
    const level = levelNumber as TechLevel;
    const maxTechs = TECHNOLOGIES.filter((t) => getPyramidLevel(t.id) === level).length;
    const currentCount = counts[level] || 0;
    const nextLevelCount = counts[(level + 1) as TechLevel] || 0;
    
    // N레벨이 다음 N+1 레벨을 해금해줄 수 있는지 여부
    const canUnlockNext = level < 5 && (currentCount > nextLevelCount);

    return {
      level,
      count: currentCount,
      maxCount: maxTechs,
      canUnlockNext,
    };
  });
}

export function checkScienceVictory(researchedTechs: (Technology | PlayerTechnology)[]): boolean {
  return researchedTechs.some((tech) => tech.id === 'space_flight');
}