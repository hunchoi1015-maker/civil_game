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
