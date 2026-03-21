// src/store/slices/uiSlice.ts

import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Position, ArmyCard } from '../../types'; 
import { TECHNOLOGIES } from '../../constants/technologies'; 
import { v4 as uuidv4 } from 'uuid';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// 🌟 [추가] 플로팅 텍스트 타입 정의
export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string; // 예: 'text-amber-400'
}

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
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // 🌟 [추가] 플로팅 텍스트 상태 및 액션 인터페이스
  floatingTexts: FloatingText[];
  addFloatingText: (x: number, y: number, text: string, color?: string) => void;
  removeFloatingText: (id: string) => void;

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

export const createUISlice: StateCreator<GameStore, [["zustand/immer", never]], [], UISlice> = (set, get) => ({
  toasts: [],
  addToast: (message, type = 'info') => set((state) => {
    if (state.toasts.length >= 5) {
      state.toasts.shift();
    }
    state.toasts.push({ id: uuidv4(), message, type });
  }),
  removeToast: (id) => set((state) => {
    state.toasts = state.toasts.filter(t => t.id !== id);
  }),

  // 🌟 [추가] 플로팅 텍스트 로직 구현
  floatingTexts: [],
  addFloatingText: (x, y, text, color = 'text-white') => set((state) => {
    state.floatingTexts.push({ id: uuidv4(), x, y, text, color });
  }),
  removeFloatingText: (id) => set((state) => {
    state.floatingTexts = state.floatingTexts.filter(t => t.id !== id);
  }),

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
    state.selectedTile = null; 
    state.selectedUnit = null; 
    state.selectedUnits = [];
    if (state.targetingMode) state.targetingMode.isActive = false; 
  }),
  
  cancelResourceSelection: () => set((state) => {
    state.resourceSelectionMode = { isActive: false, techId: null, requiredAmount: 0 };
  }),

  // 국가별 특성 액션 구현부
  russiaStealPrompt: null,
  setRussiaStealPrompt: (prompt) => set({ russiaStealPrompt: prompt }),
  resolveRussiaSteal: (techId) => {
    const state = get(); 
    const prompt = state.russiaStealPrompt;
    if (!prompt) return;
    
    set({ russiaStealPrompt: null });

    if (techId) {
      set((s) => {
        const player = s.players[s.currentPlayerIndex];
        const techDef = TECHNOLOGIES.find(t => t.id === techId);
        
        if (techDef) {
          player.technologies.push({ ...techDef, tokensOnCard: 0, abilityUsedThisTurn: false, usedPhases: [] });
          
          const unitToSacrifice = player.units.find(u => u.id === prompt.unitId);
          if (unitToSacrifice) {
            const { x, y } = unitToSacrifice.position;
            s.map.tiles[y][x].unitIds = s.map.tiles[y][x].unitIds.filter(id => id !== prompt.unitId);
          }

          player.units = player.units.filter(u => u.id !== prompt.unitId);
          
          s.selectedUnits = s.selectedUnits.filter(id => id !== prompt.unitId);
          if (s.selectedUnit === prompt.unitId) s.selectedUnit = null;
          
          player.hasUsedRussiaTechStealThisTurn = true;
          
          if (!s.combatState.log) s.combatState.log = [];
          s.combatState.log.push({ message: `🐻 [러시아 특성] 유닛을 희생하여 적의 '${techDef.name}' 기술을 도용했습니다!` });
        }
      });
    } else {
      get().startCombat(state.players[state.currentPlayerIndex].id, prompt.targetPos);
    }
  },

  germanyResourcePrompt: false,
  setGermanyResourcePrompt: (val) => set({ germanyResourcePrompt: val }),
  resolveGermanyResource: (resource) => set((state) => {
    state.germanyResourcePrompt = false;
    const player = state.players[state.currentPlayerIndex];
    
    // (선택사항) 여기서도 Toast 패턴을 원하신다면 get().addToast()를 직접 사용해도 됩니다.
    // 하지만 상태 변경(set) 내부에서 다른 상태를 덮어쓸 위험이 적은 간단한 로직이므로, 
    // 필요 시 바깥으로 빼는 "버퍼 패턴"을 적용할 수 있습니다. 
    // 지금은 기존 연결성을 위해 형태를 유지합니다.
    if (state.marketResources[resource as keyof typeof state.marketResources] > 0) {
      state.marketResources[resource as keyof typeof state.marketResources] -= 1;
      // TS 에러 방지를 위해 any 캐스팅 또는 엄격한 타입 검사 적용
      (player.resources as any)[resource] = ((player.resources as any)[resource] || 0) + 1;
      
      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `⚙️ [독일 특성] 시장에서 ${resource} 자원을 추가로 획득했습니다!` });
    } else {
      // 🌟 방어 코드: set 블록 밖에서 실행되도록 setTimeout 사용 (Immer 덮어쓰기 방지)
      setTimeout(() => get().addToast("시장에 해당 자원이 고갈되었습니다.", 'warning'), 0);
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