import { Player } from './player';
import { GameMap } from './map';
import {ResourceType} from './map'
export type GamePhase = 'start' | 'trade' | 'cityManagement' | 'movement' | 'research';

export interface GameState {
  id: string;
  turn: number;
  currentPhase: GamePhase;
  currentPlayerIndex: number;
  firstPlayerIndex: number;    // 현재 라운드의 선플레이어 인덱스
  players: Player[];
  map: GameMap;
  winner: string | null;
  winCondition: WinCondition | null;
  isGameOver: boolean;
  phaseComplete: boolean[];
  interruptState: InterruptState;
  marketResources: Record<Exclude<ResourceType, 'none'>, number>;
}

export type WinCondition = 'science' | 'culture' | 'military' | 'economic';

export interface GameConfig {
  playerCount: number;
  mapSize: 'small' | 'medium' | 'large';
  playerNames: string[];
}

export interface TurnAction {
  playerId: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export type CultureCardTargetType = 
  | 'enemy_unit' 
  | 'my_city' 
  | 'none'
  | 'player'
  | 'tile'
  | 'enemy_unit_in_range'
  | 'enemy_city_in_range';

export interface CultureEventCard {
  id: string;
  templateId: string; // [추가] 카드 종류 식별자 (예: 'exile')
  level: 1 | 2 | 3;
  name: string;
  description: string;
  targetType: CultureCardTargetType; // [추가] 타겟 방식
}

// 위인 타입 (기존 유지)
export interface GreatPerson {
  id: string;
  name: string;
  type: 'artist' | 'scientist' | 'general';
}

// [추가] 위인 타입 (간단히 정의)
export interface GreatPerson {
  id: string;
  name: string;
  type: 'artist' | 'scientist' | 'general'; // 예시 타입
}

// ==========================================
// 🌟 인터럽트(스택/체인) 시스템 관련 타입
// ==========================================

export type ActionType = 'culture_card' | 'resource_ability';

export interface StackAction {
  id: string;              // 스택의 고유 ID (예: Date.now().toString())
  sourcePlayerId: string;  // 카드/능력을 발동한 플레이어 ID
  actionType: ActionType;  // 문화카드인가, 자원능력인가?
  payload: any;            // 카드 객체나 능력의 실제 데이터
  targetActionId?: string; // (카운터일 경우) 무효화할 대상의 액션 ID
  isInvalidated?: boolean; // 누군가 무효화에 성공하면 true로 변경됨
}

export interface InterruptState {
  actionStack: StackAction[];        // 쌓여있는 행동들 (0층, 1층, 2층...)
  respondersQueue: string[];         // 개입할 기회를 기다리는 플레이어 ID 목록
  currentResponderId: string | null; // 현재 타이머가 돌아가고 있는 플레이어 ID
  timerEndsAt: number | null;        // 7초 타이머 종료 시점 (Timestamp)
}

// 🌟 위에서 정의한 GameState 인터페이스 안에 아래 속성을 추가해 주셔야 합니다!
/* export interface GameState {
  ...기존 속성들...
  interruptState: InterruptState; // <--- 이 줄을 GameState 안에 추가해 주세요!
}
*/