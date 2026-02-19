export const CULTURE_TRACK_MAX = 21;

export const CULTURE_LEVEL_RANGES = {
  LEVEL_1: { start: 1, end: 7, cost: { culture: 3, trade: 0 } },
  LEVEL_2: { start: 8, end: 14, cost: { culture: 5, trade: 3 } },
  LEVEL_3: { start: 15, end: 21, cost: { culture: 7, trade: 6 } },
};

// 위인을 얻는 칸 (각 레벨의 특정 지점)
export const GREAT_PERSON_SPOTS = [3, 7, 12, 18];

export const getCultureLevel = (track: number) => {
  if (track < 8) return 1;
  if (track < 15) return 2;
  return 3;
};

export const getNextStepCost = (currentTrack: number) => {
  const nextLevel = getCultureLevel(currentTrack + 1);
  if (nextLevel === 1) return CULTURE_LEVEL_RANGES.LEVEL_1.cost;
  if (nextLevel === 2) return CULTURE_LEVEL_RANGES.LEVEL_2.cost;
  return CULTURE_LEVEL_RANGES.LEVEL_3.cost;
};