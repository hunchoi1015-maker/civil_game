export type TechLevel = 1 | 2 | 3 | 4 | 5;

export interface Technology {
  id: string;
  name: string;
  level: TechLevel;
  cost: number;
  description: string;
  effects: TechEffect[];
  unlocks: TechUnlock[];
  isResearched: boolean;
}

export interface TechEffect {
  type: 'production' | 'trade' | 'military' | 'culture' | 'special';
  value: number;
  description: string;
}

export interface TechUnlock {
  type: 'building' | 'unit' | 'government' | 'armyTier' | 'ability';
  id: string;
  name: string;
}

export interface TechTreeState {
  researchedTechs: string[];
  currentResearch: string | null;
  researchProgress: number;
  techCounts: Record<TechLevel, number>;
}

export const TECH_PYRAMID_REQUIREMENTS: Record<TechLevel, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
};

export const SCIENCE_VICTORY_LEVEL: TechLevel = 5;
export const MAX_TRADE_TOKENS = 27;

export function canResearchTech(
  tech: Technology,
  techCounts: Record<TechLevel, number>
): boolean {
  if (tech.level === 1) return true;
  const requiredCount = TECH_PYRAMID_REQUIREMENTS[tech.level];
  const previousLevel = (tech.level - 1) as TechLevel;
  return techCounts[previousLevel] >= requiredCount;
}

export function createInitialTechCounts(): Record<TechLevel, number> {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
}
