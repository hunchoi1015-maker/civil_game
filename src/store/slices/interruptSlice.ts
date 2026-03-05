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
  
  // 1. 스택에 올릴 때
  pushActionToStack: (action) => {
    let shouldResolve = false; 

    set((state) => {
      // 🌟 핵심 1: 나중에 속성을 추가하려다 에러가 나지 않도록, 처음부터 isInvalidated를 무조건 달아서 올립니다!
      state.interruptState.actionStack.push({ 
          ...action, 
          isInvalidated: action.isInvalidated || false 
      });
      
      const responders = state.players
        .filter(p => p.id !== action.sourcePlayerId)
        .map(p => p.id);
        
      state.interruptState.respondersQueue = responders;
      
      if (responders.length > 0) {
        state.interruptState.currentResponderId = responders.shift()!;
        state.interruptState.timerEndsAt = Date.now() + 7000; 
      } else {
        shouldResolve = true;
      }
    });

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
    // 🌟 밖으로 안전하게 꺼내올 데이터들을 담을 빈 배열들
    const cardsToDiscard: { playerId: string, cardId: string }[] = [];
    const actionsToExecute: any[] = [];

    // 모든 스택 연산을 Immer의 draft(초안) 내부에서 한 번에 끝냅니다!
    set((draft) => {
      const stack = draft.interruptState.actionStack;

      // 역순 검사
      for (let i = stack.length - 1; i >= 0; i--) {
        const action = stack[i];

        // 1. 누군가 스파이 등으로 막았다면?
        if (action.isInvalidated) {
          if (action.actionType === 'culture_card') {
            cardsToDiscard.push({ playerId: action.sourcePlayerId, cardId: action.payload.cardId });
          }
          continue; 
        }

        // 2. 이 액션이 다른 액션을 타겟팅(방어)하는 카운터 액션이라면?
        if (action.targetActionId) {
          const targetAction = stack.find(a => a.id === action.targetActionId);
          if (targetAction) {
              // 처음 올릴 때 속성을 미리 만들어뒀으므로, 이제 여기서 에러 없이 값이 바뀝니다!
              targetAction.isInvalidated = true;
          }
        } 
        // 3. 막히지 않은 정상 액션이라면?
        else {
          if (action.actionType === 'culture_card') {
             // 🌟 핵심 2: Proxy 파기 에러를 막기 위해 payload를 '깊은 복사'하여 순수 객체로 만듭니다!
             const payloadClone = JSON.parse(JSON.stringify(action.payload));
             
             actionsToExecute.push({
                 cardId: action.payload.cardId,
                 payload: { ...payloadClone, sourcePlayerId: action.sourcePlayerId }
             });
          }
        }
      }

      // 방해받아 낭비된 카드들을 손에서 지우기
      cardsToDiscard.forEach(({ playerId, cardId }) => {
        const p = draft.players.find(p => p.id === playerId);
        if (p && p.cultureEventCards) {
           const idx = p.cultureEventCards.findIndex(c => c.id === cardId);
           if (idx !== -1) p.cultureEventCards.splice(idx, 1); 
        }
      });

      // 스택과 타이머 초기화 (청소)
      draft.interruptState.actionStack = [];
      draft.interruptState.currentResponderId = null;
      draft.interruptState.timerEndsAt = null;
    });

    // 🌟 set 블록 밖으로 빠져나왔으므로, 이제 안전하게 복사해둔 객체들로 진짜 능력을 발동시킵니다!
    actionsToExecute.forEach(actionData => {
       get().executeCultureCard(actionData.cardId, actionData.payload);
    });
  }
});