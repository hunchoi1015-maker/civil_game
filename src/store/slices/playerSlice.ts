import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Resources } from '../../types';
import { calculateTradeIncome } from '../../engine/GameEngine';
import { GOVERNMENTS } from '../../constants/governments';
import { findPlayerById } from '../helpers/playerHelpers';

export interface PlayerSlice {
  updateResources: (playerId: string, resources: Partial<Resources>) => void;
  addTrade: (playerId: string, amount: number) => void;
  collectTradeIncome: (playerId: string) => boolean;
  spendTrade: (playerId: string, amount: number) => boolean;
  addCurrency: (playerId: string, amount: number) => void;
  addCulture: (playerId: string, amount: number) => void;
  changeGovernment: (playerId: string, government: string) => void;
}

export const createPlayerSlice: StateCreator<GameStore, [["zustand/immer", never]], [], PlayerSlice> = (set, get) => ({
  updateResources: (playerId: string, resources: Partial<Resources>) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (player) {
        Object.assign(player.resources, resources);
      }
    });
  },

  addTrade: (playerId: string, amount: number) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (player) {
        player.resources.trade = Math.min(27, player.resources.trade + amount);
      }
    });
  },

  collectTradeIncome: (playerId: string) => {
    const state = get();
    if (state.currentPhase !== 'trade') {
      return false;
    }
    const player = findPlayerById(state.players, playerId);
    if (!player) return false;
    if (player.hasCollectedTrade) {
      return false;
    }
    const tradeIncome = calculateTradeIncome(player, state.map);
    set((state) => {
      const p = findPlayerById(state.players, playerId);
      if (p) {
        p.resources.trade = Math.min(27, p.resources.trade + tradeIncome);
        p.hasCollectedTrade = true;
      }
    });
    return true;
  },

  spendTrade: (playerId: string, amount: number) => {
    const player = findPlayerById(get().players, playerId);
    if (!player || player.resources.trade < amount) return false;
    set((state) => {
      const p = findPlayerById(state.players, playerId);
      if (p) {
        p.resources.trade -= amount;
      }
    });
    return true;
  },

  addCurrency: (playerId: string, amount: number) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (player) {
        player.resources.currency += amount;
      }
    });
  },

  addCulture: (playerId: string, amount: number) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (player) {
        player.cultureTrack += amount;
      }
    });
  },

  changeGovernment: (playerId: string, government: string) => {
    if (get().currentPhase !== 'start') {
      return;
    }
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      const govDef = GOVERNMENTS[government as keyof typeof GOVERNMENTS];
      if (!govDef) return;
      if (govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
        return;
      }
      player.government = government as any;
    });
  },
});