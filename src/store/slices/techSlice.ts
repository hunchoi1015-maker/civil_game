import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore, TurnResearchResult } from '../types/storeTypes';
import { ArmyCardType, ArmyTier, createArmyCard } from '../../types';
import { TECHNOLOGIES } from '../../constants/technologies';
import { findPlayerById } from '../helpers/playerHelpers';

export interface TechSlice {
  researchTech: (playerId: string, techId: string) => boolean;
  produceArmyCard: (playerId: string, type: ArmyCardType, tier: ArmyTier, attack: number, health: number, name: string, cityId?: string) => void;
  removeArmyCard: (playerId: string, cardId: string) => void;
  turnResearchResults: TurnResearchResult[];
  showResearchResults: boolean;
  recordResearch: (playerId: string, techId: string, techName: string) => void;
  clearResearchResults: () => void;
  setShowResearchResults: (show: boolean) => void;
}

export const createTechSlice: StateCreator<GameStore, [["zustand/immer", never]], [], TechSlice> = (set, get) => ({
  turnResearchResults: [],
  showResearchResults: false,

  researchTech: (playerId: string, techId: string) => {
    if (get().currentPhase !== 'research') return false;
    const player = findPlayerById(get().players, playerId);
    if (!player) return false;
    if (player.hasResearchedThisTurn) return false;

    const tech = TECHNOLOGIES.find((t) => t.id === techId);
    if (!tech) return false;
    if (player.resources.trade < tech.cost) return false;

    // 피라미드 제약 확인
    const techCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    player.technologies.forEach((t) => {
      techCounts[t.level as keyof typeof techCounts]++;
    });
    if (tech.level > 1) {
      const requiredCount = tech.level - 1;
      const previousLevel = (tech.level - 1) as 1 | 2 | 3 | 4 | 5;
      if (techCounts[previousLevel] < requiredCount) return false;
    }

    set((state) => {
      const p = findPlayerById(state.players, playerId);
      if (p) {
        p.resources.trade -= tech.cost;
        p.technologies.push({ ...tech, isResearched: true });
        p.hasResearchedThisTurn = true;
      }
    });
    get().recordResearch(playerId, techId, tech.name);
    return true;
  },

  produceArmyCard: (playerId: string, type: ArmyCardType, tier: ArmyTier, attack: number, health: number, name: string, cityId?: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      if (state.currentPhase === 'cityManagement' && cityId) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city?.hasActedThisTurn) return;
      }
      const card = createArmyCard(uuidv4(), type, tier, playerId, attack, health, name);
      player.armyCards.push(card);
      if (state.currentPhase === 'cityManagement' && cityId) {
        const city = player.cities.find((c) => c.id === cityId);
        if (city) city.hasActedThisTurn = true;
      }
    });
  },

  removeArmyCard: (playerId: string, cardId: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      if (!player) return;
      const cardIndex = player.armyCards.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1) {
        player.armyCards.splice(cardIndex, 1);
      }
    });
  },

  recordResearch: (playerId: string, techId: string, techName: string) => {
    set((state) => {
      const player = findPlayerById(state.players, playerId);
      const existingIndex = state.turnResearchResults.findIndex((r) => r.playerId === playerId);
      if (existingIndex >= 0) {
        state.turnResearchResults[existingIndex] = {
          playerId,
          playerName: player?.name || '',
          techId,
          techName,
        };
      } else {
        state.turnResearchResults.push({
          playerId,
          playerName: player?.name || '',
          techId,
          techName,
        });
      }
    });
  },

  clearResearchResults: () => {
    set((state) => {
      state.turnResearchResults = [];
      state.showResearchResults = false;
    });
  },

  setShowResearchResults: (show: boolean) => {
    set((state) => {
      state.showResearchResults = show;
    });
  },
});