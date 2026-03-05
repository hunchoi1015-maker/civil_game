// src/store/slices/interruptSlice.ts

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
  
  // 1. 스택에 올릴 때 (🌟 타겟팅 조건부 모달 발동)
  pushActionToStack: (action) => {
    let shouldResolve = false; 

    set((state) => {
      state.interruptState.actionStack.push({ 
          ...action, 
          isInvalidated: action.isInvalidated || false 
      });
      
      // 🌟 액션 타입에 따라 개입할 수 있는 플레이어를 지능적으로 걸러냅니다! (조건부 렌더링)
      const responders = state.players.filter(p => {
          if (p.id === action.sourcePlayerId) return false;
          if (action.actionType === 'culture_card') {
              // 문화 카드는 공공서비스 + 스파이 필요
              return p.technologies.some(t => t.id === 'civil_service') && p.spies > 0;
          } else if (action.actionType === 'resource_ability') {
              // 자원 능력은 대중매체 + 스파이 + 이번 턴 미사용 필요
              return p.technologies.some(t => t.id === 'mass_media') && p.spies > 0 && !p.hasUsedMassMediaThisTurn;
          }
          return false;
      }).map(p => p.id);
        
      state.interruptState.respondersQueue = responders;
      
      if (responders.length > 0) {
        state.interruptState.currentResponderId = responders[0];
        state.interruptState.timerEndsAt = Date.now() + 7000; 
      } else {
        shouldResolve = true;
      }
    });

    if (shouldResolve) get().resolveStack();
  },

  // 2. 통과
  passInterrupt: () => {
    let shouldResolve = false; 
    set((state) => {
      state.interruptState.respondersQueue.shift(); // 현재 사람 빼기
      const nextResponder = state.interruptState.respondersQueue[0];
      if (nextResponder) {
        state.interruptState.currentResponderId = nextResponder;
        state.interruptState.timerEndsAt = Date.now() + 7000;
      } else {
        state.interruptState.currentResponderId = null;
        state.interruptState.timerEndsAt = null;
        shouldResolve = true; 
      }
    });
    if (shouldResolve) get().resolveStack();
  },

  // 3. 스파이 파견 (방어 & 방해)
  useSpyCounter: (responderId, targetActionId) => {
    const state = get();
    const player = state.players.find(p => p.id === responderId);
    const targetAction = state.interruptState.actionStack.find(a => a.id === targetActionId);

    if (!player || player.spies < 1 || !targetAction) return;

    set((draft) => {
      const draftPlayer = draft.players.find(p => p.id === responderId);
      if (draftPlayer) {
          draftPlayer.spies -= 1;
          // 🌟 자원 능력(대중매체)을 방어하기 위해 사용했다면 1회 제한을 소모시킴!
          if (targetAction.actionType === 'resource_ability') {
              draftPlayer.hasUsedMassMediaThisTurn = true;
          }
      }
      if (draft.combatState && !draft.combatState.log) draft.combatState.log = [];
      draft.combatState?.log?.push({ message: `🕵️ ${draftPlayer?.name || '누군가'}이(가) 스파이를 파견하여 개입했습니다!` });
    });

    // 🌟 방어 액션을 다시 스택에 올립니다. 이때 actionType을 타겟과 동일하게 맞춰, '방어의 방어'도 같은 룰을 따르게 합니다.
    get().pushActionToStack({
      id: Date.now().toString(),
      sourcePlayerId: responderId,
      actionType: targetAction.actionType,
      payload: { type: 'spy_counter' },
      targetActionId: targetActionId
    });
  },

  // 4. 스택 역순(LIFO) 해결기
  resolveStack: () => {
    const cardsToDiscard: { playerId: string, cardId: string }[] = [];
    const actionsToExecute: any[] = [];

    set((draft) => {
      const stack = draft.interruptState.actionStack;

      // 역순 검사
      for (let i = stack.length - 1; i >= 0; i--) {
        const action = stack[i];

        if (action.isInvalidated) {
          if (action.actionType === 'culture_card') cardsToDiscard.push({ playerId: action.sourcePlayerId, cardId: action.payload.cardId });
          continue; 
        }

        if (action.targetActionId) {
          const targetAction = stack.find(a => a.id === action.targetActionId);
          if (targetAction) targetAction.isInvalidated = true; // 무효화 처리
        } 
        else if (action.payload.type !== 'spy_counter') { // 정상 액션 (카운터 스킬 제외)
          const payloadClone = JSON.parse(JSON.stringify(action.payload));
          actionsToExecute.push({
              actionType: action.actionType,
              sourcePlayerId: action.sourcePlayerId,
              payload: payloadClone
          });
        }
      }

      // 방해받아 낭비된 문화 카드 제거
      cardsToDiscard.forEach(({ playerId, cardId }) => {
        const p = draft.players.find(p => p.id === playerId);
        if (p && p.cultureEventCards) {
           const idx = p.cultureEventCards.findIndex(c => c.id === cardId);
           if (idx !== -1) p.cultureEventCards.splice(idx, 1); 
        }
      });

      draft.interruptState.actionStack = [];
      draft.interruptState.currentResponderId = null;
      draft.interruptState.timerEndsAt = null;
    });

    // 안전하게 복사해둔 객체들로 진짜 능력들을 발동 (위에서 아래로, LIFO 결과대로)
    actionsToExecute.forEach(actionData => {
       if (actionData.actionType === 'culture_card') {
           get().executeCultureCard(actionData.payload.cardId, { ...actionData.payload, sourcePlayerId: actionData.sourcePlayerId });
       } else if (actionData.actionType === 'resource_ability') {
           get().executeTechAbility(actionData.sourcePlayerId, actionData.payload.techId, actionData.payload);
       }
    });
  }
});