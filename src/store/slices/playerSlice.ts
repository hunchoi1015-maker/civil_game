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

  changeGovernment: (playerId: string, targetGovernment: string) => {
    if (get().currentPhase !== 'start') {
      alert("정치체제는 턴의 '시작' 단계에서만 변경할 수 있습니다.");
      return;
    }
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      const currentGov = player.government;
      
      // 🌟 1. 봉건제 해제 시 화폐 -1 페널티 (무정부로 갈 때도 적용됨!)
      if (currentGov === 'feudalism' && targetGovernment !== 'feudalism') {
          player.resources.currency = Math.max(0, player.resources.currency - 1);
      }

      // 🌟 2. 타겟 체제 적용 (무정부 또는 해금된 정상 체제)
      if (targetGovernment === 'anarchy') {
          player.government = 'anarchy';
      } else {
          // 정상 체제로 갈아탈 때
          const govDef = GOVERNMENTS[targetGovernment as keyof typeof GOVERNMENTS];
          if (!govDef) return;
          
          if (govDef.requiredTech && !player.technologies.some(t => t.id === govDef.requiredTech)) {
              alert("해당 체제를 해금하는 기술이 없습니다.");
              return;
          }

          player.government = targetGovernment as any;

          // 🌟 봉건제를 새롭게 채택했다면 화폐 +1 보너스!
          if (targetGovernment === 'feudalism' && currentGov !== 'feudalism') {
              player.resources.currency = Math.min(4, player.resources.currency + 1);
          }
      }

      // 체제를 변경했으므로 무료 기회 소모 (만약 썼다면)
      player.freeGovernmentSwitch = false;
      
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `👑 ${player.name}이(가) 정치체제를 [${targetGovernment === 'anarchy' ? '무정부' : GOVERNMENTS[targetGovernment as keyof typeof GOVERNMENTS]?.name}]로 변경했습니다!` });
    });
  },
});