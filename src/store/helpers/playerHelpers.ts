import { Player } from '../../types';

export function getPlayerOrder(firstPlayerIndex: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    order.push((firstPlayerIndex + i) % playerCount);
  }
  return order;
}

export function findPlayerById(players: Player[], playerId: string): Player | undefined {
  return players.find((p) => p.id === playerId);
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}