import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { StackAction } from '../../types/game';

export interface InterruptSlice {
  pushActionToStack: (action: StackAction) => void;
  passInterrupt: () => void;
  useSpyCounter: (responderId: string, targetActionId: string) => void;
  resolveStack: () => void;
}

export const createInterruptSlice: StateCreator<GameStore, [["zustand/immer", never]], [], InterruptSlice> = (set, get) => ({
  
  // 1. 행동을 스택에 올리고 대기열 세팅
  pushActionToStack: (action) => {
    let shouldResolve = false; // 🌟 set 블록 밖에서 실행하기 위한 플래그

    set((state) => {
      state.interruptState.actionStack.push(action);
      
      const responders = state.players
        .filter(p => p.id !== action.sourcePlayerId)
        .map(p => p.id);
        
      state.interruptState.respondersQueue = responders;
      
      if (responders.length > 0) {
        state.interruptState.currentResponderId = responders.shift()!;
        state.interruptState.timerEndsAt = Date.now() + 7000; 
      } else {
        // 대기자가 없으면 밖에서 폭발시키도록 플래그만 켬!
        shouldResolve = true;
      }
    });

    // 🌟 안전구역(set 바깥)에서 함수 호출
    if (shouldResolve) get().resolveStack();
  },

  // 2. 통과하거나 타이머 만료 시
  passInterrupt: () => {
    let shouldResolve = false; // 🌟 플래그 도입

    set((state) => {
      const nextResponder = state.interruptState.respondersQueue.shift();
      if (nextResponder) {
        state.interruptState.currentResponderId = nextResponder;
        state.interruptState.timerEndsAt = Date.now() + 7000;
      } else {
        // 대기열 끝! 밖에서 폭발시키도록 플래그 켬!
        state.interruptState.currentResponderId = null;
        state.interruptState.timerEndsAt = null;
        shouldResolve = true; 
      }
    });

    // 🌟 안전구역(set 바깥)에서 함수 호출
    if (shouldResolve) get().resolveStack();
  },

  // 3. 스파이 파견 (방어)
  useSpyCounter: (responderId, targetActionId) => {
    const state = get();
    const player = state.players.find(p => p.id === responderId);
    if (!player || player.spies < 1) return;

    set((draft) => {
      const draftPlayer = draft.players.find(p => p.id === responderId);
      if (draftPlayer) draftPlayer.spies -= 1;
      
      // 혹시 모를 배열 미존재 에러 방지
      if (draft.combatState && !draft.combatState.log) draft.combatState.log = [];
      draft.combatState?.log?.push({ 
        message: `🕵️ ${draftPlayer?.name || '누군가'}이(가) 스파이를 파견하여 개입했습니다!` 
      });
    });

    // 🌟 새로운 스택을 올리는 로직을 set 밖에서 안전하게 호출!
    get().pushActionToStack({
      id: Date.now().toString(),
      sourcePlayerId: responderId,
      actionType: 'resource_ability',
      payload: { type: 'spy_counter' },
      targetActionId: targetActionId
    });
  },

  // 4. 스택 역순(LIFO) 해결기
  resolveStack: () => {
    let stackToResolve: StackAction[] = [];
    
    set((draft) => {
      stackToResolve = [...draft.interruptState.actionStack];
      draft.interruptState.actionStack = []; 
      draft.interruptState.currentResponderId = null;
      draft.interruptState.timerEndsAt = null;
    });

    for (let i = stackToResolve.length - 1; i >= 0; i--) {
      const action = stackToResolve[i];
      if (action.isInvalidated) continue;

      if (action.targetActionId) {
        const targetAction = stackToResolve.find(a => a.id === action.targetActionId);
        if (targetAction) targetAction.isInvalidated = true;
      } 
      else {
        if (action.actionType === 'culture_card') {
          // 🌟 마지막 진짜 카드 효과 발동!
          get().executeCultureCard(action.payload.cardId, action.payload);
        }
      }
    }
  }
});