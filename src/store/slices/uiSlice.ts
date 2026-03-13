// src/store/slices/uiSlice.ts

import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Position, ArmyCard } from '../../types'; 
import { TECHNOLOGIES } from '../../constants/technologies'; 

export interface ResourceSelectionMode {
  isActive: boolean;
  techId: string | null;
  requiredAmount: number;
}

export interface TargetingMode {
  isActive: boolean;
  techId: string | null;
  targetType: 'city' | 'tile' | 'my_city' | 'wonder_location' | null;
}

export interface UISlice {
  selectedTile: Position | null;
  selectedUnit: string | null;
  selectedUnits: string[];
  setSelectedTile: (position: Position | null) => void;
  setSelectedUnit: (unitId: string | null) => void;
  setSelectedUnits: (unitIds: string[]) => void;
  toggleUnitSelection: (unitId: string) => void;
  targetingMode: TargetingMode;
  startTargeting: (techId: string, targetType: 'city' | 'tile'|'my_city'|'wonder_location'  ) => void;
  cancelTargeting: () => void;

  resourceSelectionMode: ResourceSelectionMode;
  startResourceSelection: (techId: string, requiredAmount: number) => void;
  cancelResourceSelection: () => void;

  // 국가별 특성 UI 상태
  // 러시아 특성
  russiaStealPrompt: { unitId: string; targetPlayerId: string; targetPos: Position } | null;
  setRussiaStealPrompt: (prompt: any) => void;
  resolveRussiaSteal: (techId: string | null) => void;

  // 독일 특성
  germanyResourcePrompt: boolean;
  setGermanyResourcePrompt: (val: boolean) => void;
  resolveGermanyResource: (resource: string) => void;

  // 중국 특성
  chinaGraveyardPrompt: { playerId: string; cards: ArmyCard[] } | null;
  setChinaGraveyardPrompt: (prompt: any) => void;
  resolveChinaGraveyard: (cardId: string) => void;
}

// (set) => ({ ... }) 에서 (set, get) => ({ ... }) 로 변경했습니다!
export const createUISlice: StateCreator<GameStore, [["zustand/immer", never]], [], UISlice> = (set, get) => ({
  selectedTile: null,
  selectedUnit: null,
  selectedUnits: [],

  setSelectedTile: (position: Position | null) => {
    set((state) => {
      state.selectedTile = position;
    });
  },

  setSelectedUnit: (unitId: string | null) => {
    set((state) => {
      state.selectedUnit = unitId;
      state.selectedUnits = unitId ? [unitId] : [];
    });
  },

  setSelectedUnits: (unitIds: string[]) => {
    set((state) => {
      state.selectedUnits = unitIds;
      state.selectedUnit = unitIds.length > 0 ? unitIds[0] : null;
    });
  },

  toggleUnitSelection: (unitId: string) => {
    set((state) => {
      const idx = state.selectedUnits.indexOf(unitId);
      if (idx >= 0) {
        state.selectedUnits.splice(idx, 1);
      } else {
        state.selectedUnits.push(unitId);
      }
      state.selectedUnit = state.selectedUnits.length > 0 ? state.selectedUnits[0] : null;
    });
  },
  targetingMode: { isActive: false, techId: null, targetType: null },
  
  startTargeting: (techId: string, targetType: 'city' | 'tile'|'my_city' | 'wonder_location') => set((state) => {
    state.targetingMode = { isActive: true, techId, targetType };
    // 타겟팅에 집중할 수 있도록 열려있던 다른 선택창들을 닫아줍니다. 
    state.selectedTile = null;
    state.selectedUnit = null; 
    state.selectedUnits = [];
  }),
  
  cancelTargeting: () => set((state) => {
    state.targetingMode = { isActive: false, techId: null, targetType: null };
  }),
  resourceSelectionMode: { isActive: false, techId: null, requiredAmount: 0 },
  
  startResourceSelection: (techId: string, requiredAmount: number) => set((state) => {
    state.resourceSelectionMode = { isActive: true, techId, requiredAmount };
    // 다른 선택창 닫기
    state.selectedTile = null; 
    state.selectedUnit = null; 
    state.selectedUnits = [];
    if (state.targetingMode) state.targetingMode.isActive = false; // 타겟팅 모드 끄기
  }),
  
  cancelResourceSelection: () => set((state) => {
    state.resourceSelectionMode = { isActive: false, techId: null, requiredAmount: 0 };
  }),

  // 국가별 특성 액션 구현부
  russiaStealPrompt: null,
  setRussiaStealPrompt: (prompt) => set({ russiaStealPrompt: prompt }),
  resolveRussiaSteal: (techId) => {
    const state = get(); // 이제 get()을 정상적으로 사용할 수 있습니다!
    const prompt = state.russiaStealPrompt;
    if (!prompt) return;
    
    // 모달 닫기
    set({ russiaStealPrompt: null });

    if (techId) {
      set((s) => {
        const player = s.players[s.currentPlayerIndex];
        const techDef = TECHNOLOGIES.find(t => t.id === techId);
        if (techDef) {
          // 기술 추가
          player.technologies.push({ ...techDef, tokensOnCard: 0, abilityUsedThisTurn: false, usedPhases: [] });
          // 유닛 희생 (맵과 플레이어 목록에서 제거)
          player.units = player.units.filter(u => u.id !== prompt.unitId);
          s.map.tiles[prompt.targetPos.y][prompt.targetPos.x].unitIds = s.map.tiles[prompt.targetPos.y][prompt.targetPos.x].unitIds.filter(id => id !== prompt.unitId);
          
          player.hasUsedRussiaTechStealThisTurn = true;
          if (!s.combatState.log) s.combatState.log = [];
          s.combatState.log.push({ message: `🐻 [러시아 특성] 유닛을 희생하여 적의 '${techDef.name}' 기술을 도용했습니다!` });
        }
      });
    } else {
      // 도용을 거절했으므로 정상적으로 전투 시작
      get().startCombat(state.players[state.currentPlayerIndex].id, prompt.targetPos);
    }
  },

  germanyResourcePrompt: false,
  setGermanyResourcePrompt: (val) => set({ germanyResourcePrompt: val }),
  resolveGermanyResource: (resource) => set((state) => {
    state.germanyResourcePrompt = false;
    const player = state.players[state.currentPlayerIndex];
    if (state.marketResources[resource as keyof typeof state.marketResources] > 0) {
      state.marketResources[resource as keyof typeof state.marketResources] -= 1;
      player.luxuryResources[resource as keyof typeof player.luxuryResources] += 1;
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `⚙️ [독일 특성] 시장에서 ${resource} 자원을 추가로 획득했습니다!` });
    } else {
      alert("시장에 해당 자원이 고갈되었습니다.");
    }
  }),

  chinaGraveyardPrompt: null,
  setChinaGraveyardPrompt: (prompt) => set({ chinaGraveyardPrompt: prompt }),
  resolveChinaGraveyard: (cardId) => set((state) => {
    const prompt = state.chinaGraveyardPrompt;
    if (!prompt) return;
    state.chinaGraveyardPrompt = null;

    const player = state.players.find(p => p.id === prompt.playerId);
    if (!player) return;

    const cardToRevive = prompt.cards.find(c => c.id === cardId);
    if (cardToRevive) {
      cardToRevive.health = cardToRevive.maxHealth;
      player.armyCards.push(cardToRevive);
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `🐉 [중국 특성] 전투 종료 후 '${cardToRevive.name}' 부대가 무덤에서 무사히 귀환했습니다!` });
    }
  }),
});