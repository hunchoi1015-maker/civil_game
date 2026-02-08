import { GamePhase } from '../../types';

export function canPerformActionInPhase(action: 'research' | 'build' | 'move' | 'trade' | 'combat', currentPhase: GamePhase): boolean {
  switch (action) {
    case 'research':
      return currentPhase === 'research';
    case 'build':
      return currentPhase === 'cityManagement';
    case 'move':
      return currentPhase === 'movement';
    case 'trade':
      return currentPhase === 'trade';
    case 'combat':
      return currentPhase === 'movement';
    default:
      return false;
  }
}