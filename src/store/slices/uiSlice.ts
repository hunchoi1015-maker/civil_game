import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Position } from '../../types';

export interface ResourceSelectionMode {
  isActive: boolean;
  techId: string | null;
  requiredAmount: number;
}

export interface TargetingMode {
  isActive: boolean;
  techId: string | null;
  targetType: 'city' | 'tile' | 'my_city' | null;
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
  startTargeting: (techId: string, targetType: 'city' | 'tile'|'my_city' ) => void;
  cancelTargeting: () => void;

  resourceSelectionMode: ResourceSelectionMode;
  startResourceSelection: (techId: string, requiredAmount: number) => void;
  cancelResourceSelection: () => void;
}

export const createUISlice: StateCreator<GameStore, [["zustand/immer", never]], [], UISlice> = (set) => ({
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
  
  startTargeting: (techId: string, targetType: 'city' | 'tile'|'my_city' ) => set((state) => {
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
});