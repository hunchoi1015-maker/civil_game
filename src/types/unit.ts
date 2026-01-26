import { Position } from './map';

export type UnitType = 'military' | 'settler';

export interface Unit {
  id: string;
  type: UnitType;
  ownerId: string;
  position: Position;
  movement: number;
  maxMovement: number;
  strength: number;
  hasMoved: boolean;
  canAttack: boolean;
}

export interface UnitDefinition {
  type: UnitType;
  name: string;
  movement: number;
  strength: number;
  productionCost: number;
  description: string;
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  military: {
    type: 'military',
    name: '군사 유닛',
    movement: 2,
    strength: 1,
    productionCost: 4,
    description: '전투와 방어에 사용되는 유닛',
  },
  settler: {
    type: 'settler',
    name: '개척자',
    movement: 2,
    strength: 0,
    productionCost: 6,
    description: '새로운 도시를 건설하거나 타일을 영토로 할당',
  },
};

export const MAX_MILITARY_UNITS = 6;
export const MAX_SETTLER_UNITS = 2;
export const BASE_STACKING_LIMIT = 2;  // 기본 타일당 유닛 배치 제한

export function createUnit(
  id: string,
  type: UnitType,
  ownerId: string,
  position: Position
): Unit {
  const def = UNIT_DEFINITIONS[type];
  return {
    id,
    type,
    ownerId,
    position,
    movement: def.movement,
    maxMovement: def.movement,
    strength: def.strength,
    hasMoved: false,
    canAttack: type === 'military',
  };
}
