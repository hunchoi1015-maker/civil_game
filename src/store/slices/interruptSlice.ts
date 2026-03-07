// src/store/slices/interruptSlice.ts

import { StateCreator } from 'zustand';
import { GameStore } from '../types/storeTypes';
import { StackAction } from '../../types/game';
import { hasActiveWonder } from '../helpers/playerHelpers';

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
      let responders: string[] = [];

      // 1순위: 문화 카드의 타겟이 나이고, 내가 국제연합을 가지고 있다면 무조건 0순위 개입 권한 획득 (스파이/기술 무관!)
      if (action.actionType === 'culture_card' && action.payload?.targetPlayerId) {
          const targetId = action.payload.targetPlayerId;
          const targetPlayer = state.players.find(p => p.id === targetId);
          if (targetPlayer && hasActiveWonder(targetId, 'un', state.map, state.players)) {
              responders.push(targetId);
          }
      }

      // 2순위: 기존의 기술+스파이 개입자들 추가
      const standardResponders = state.players.filter(p => {
          if (p.id === action.sourcePlayerId) return false;
          // 방금 1순위로 들어간 사람은 중복으로 넣지 않음
          if (responders.includes(p.id)) return false; 
          
          if (action.actionType === 'culture_card') {
              return p.technologies.some(t => t.id === 'civil_service') && p.spies > 0;
          } else if (action.actionType === 'resource_ability') {
              return p.technologies.some(t => t.id === 'mass_media') && p.spies > 0 && !p.hasUsedMassMediaThisTurn;
          }
          return false;
      }).map(p => p.id);

      responders = [...responders, ...standardResponders];
        
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

    if (!player || !targetAction) return;

    // 🌟 [추가] 내가 문화 카드의 타겟이고 국제연합이 있는가?
    const isUnDefense = targetAction.actionType === 'culture_card' 
                     && targetAction.payload?.targetPlayerId === responderId 
                     && hasActiveWonder(responderId, 'un', state.map, state.players);

    // 스파이가 없고 UN 방어도 아니라면 불가!
    if (player.spies < 1 && !isUnDefense) return;

    set((draft) => {
      const draftPlayer = draft.players.find(p => p.id === responderId);
      if (draftPlayer) {
          // 🌟 UN 방어가 아닐 때만 스파이 차감!
          if (!isUnDefense) draftPlayer.spies -= 1;
          
          if (targetAction.actionType === 'resource_ability') {
              draftPlayer.hasUsedMassMediaThisTurn = true;
          }
      }
      if (draft.combatState && !draft.combatState.log) draft.combatState.log = [];
      
      // 로그도 다르게 출력
      if (isUnDefense) {
          draft.combatState?.log?.push({ message: `🌐 [국제연합] ${draftPlayer?.name || '누군가'}이(가) 거부권을 행사하여 이벤트를 무효화했습니다!` });
      } else {
          draft.combatState?.log?.push({ message: `🕵️ ${draftPlayer?.name || '누군가'}이(가) 스파이를 파견하여 개입했습니다!` });
      }
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