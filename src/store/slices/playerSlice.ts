import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Resources } from '../../types';
import { calculateTradeIncome } from '../../engine/GameEngine';
import { GOVERNMENTS } from '../../constants/governments';
import { findPlayerById, hasActiveWonder } from '../helpers/playerHelpers';

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

  changeGovernment: (playerId: string, targetGovernment: string) => {
    if (get().currentPhase !== 'start') {
      get().addToast("정치체제는 턴의 '시작' 단계에서만 변경할 수 있습니다.");
      return;
    }
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      const currentGov = player.government;

      // 🌟 피라미드 보유 확인
      const hasPyramids = hasActiveWonder(playerId, 'pyramids', state.map, state.players);
      
      if (currentGov === 'feudalism' && targetGovernment !== 'feudalism') {
          player.resources.currency = Math.max(0, player.resources.currency - 1);
      }

      if (targetGovernment === 'anarchy') {
          // 🌟 무정부 면역!
          if (hasPyramids) {
              if (!state.combatState.log) state.combatState.log = [];
              state.combatState.log.push({ message: `🏛️ [피라미드] 효과로 ${player.name}은(는) 무정부 상태에 빠지지 않습니다!` });
              return;
          }
          player.government = 'anarchy';
      } else {
          const govDef = GOVERNMENTS[targetGovernment as keyof typeof GOVERNMENTS];
          if (!govDef) return;
          
          // 🌟 피라미드가 없다면 기술 검사
          if (!hasPyramids && govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
              get().addToast("해당 체제를 해금하는 기술이 없습니다.");
              return;
          }

          player.government = targetGovernment as any;
          if (targetGovernment === 'feudalism' && currentGov !== 'feudalism') {
              player.resources.currency = Math.min(4, player.resources.currency + 1);
          }
      }

      player.freeGovernmentSwitch = false;
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `👑 ${player.name}이(가) 정치체제를 [${targetGovernment === 'anarchy' ? '무정부' : GOVERNMENTS[targetGovernment as keyof typeof GOVERNMENTS]?.name}]로 변경했습니다!` });
    });
  },
});