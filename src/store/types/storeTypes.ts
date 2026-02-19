import { NationType, Position, GameState, GameConfig, Tile,  } from '../../types';
import { StateCreator } from 'zustand';
import { CultureSlice } from '../slices/cultureSlice';

// [수정] 'any' 제거 및 타입 구체화
// GameSlice는 기본 데이터(GameState)와 자기 자신의 액션(T)을 알고 있는 상태로 정의합니다.
// 이렇게 하면 GameStore(전체 스토어)가 이 타입의 상위 집합이므로 호환됩니다.
export type GameSlice<T> = StateCreator<
  GameState & T, 
  [['zustand/immer', never]],
  [],
  T
>;

// GameSetupState 정의
export interface GameSetupState {
  phase: 'nationSelect' | 'capitalSelect' | 'ready';
  currentSetupPlayer: number;
  selectedNations: (NationType | null)[];
  capitalPositionOptions: Position[][];
}

// TurnResearchResult 정의
export interface TurnResearchResult {
  playerId: string;
  playerName: string;
  techId: string | null;
  techName: string | null;
}

// 전체 스토어 State 인터페이스 (모든 Slice 통합)
export interface GameStore extends GameState, 
  GameSetupSlice,
  TurnManagementSlice,
  PlayerSlice,
  CitySlice,
  UnitSlice,
  CombatSlice,
  TechSlice,
  UISlice,
  CultureSlice
  {
  // 공통 액션
  initGame: (config: GameConfig) => void;
  resetGame: () => void;
  getTile: (position: Position) => Tile | null;
  setTileOwner: (position: Position, ownerId: string | null) => void;
  checkVictory: () => void;
  canPerformAction: (action: 'research' | 'build' | 'move' | 'trade' | 'combat') => boolean;
}

// Slice 인터페이스들 (순환 참조 방지를 위해 여기서 export 하거나 각 Slice 파일에서 정의할 수 있음. 
// 여기서는 각 Slice 파일에서 정의하고 GameStore에서 합치는 방식을 사용하므로 아래는 참조용입니다.)
import { GameSetupSlice } from '../slices/gameSetupSlice';
import { TurnManagementSlice } from '../slices/turnManagementSlice';
import { PlayerSlice } from '../slices/playerSlice';
import { CitySlice } from '../slices/citySlice';
import { UnitSlice } from '../slices/unitSlice';
import { CombatSlice } from '../slices/combatSlice';
import { TechSlice } from '../slices/techSlice';
import { UISlice } from '../slices/uiSlice';