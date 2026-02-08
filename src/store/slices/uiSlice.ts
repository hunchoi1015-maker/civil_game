import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { Position } from '../../types';

export interface UISlice {
  selectedTile: Position | null;
  selectedUnit: string | null;
  selectedUnits: string[];
  setSelectedTile: (position: Position | null) => void;
  setSelectedUnit: (unitId: string | null) => void;
  setSelectedUnits: (unitIds: string[]) => void;
  toggleUnitSelection: (unitId: string) => void;
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
});