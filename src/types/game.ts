import { Player } from './player';
import { GameMap } from './map';

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

export interface CultureEventCard {
  id: string;
  level: 1 | 2 | 3;
  name: string;
  description: string;
  effect: (playerId: string) => void; // 실제 효과 로직은 나중에 구현
}

// [추가] 위인 타입 (간단히 정의)
export interface GreatPerson {
  id: string;
  name: string;
  type: 'artist' | 'scientist' | 'general'; // 예시 타입
}