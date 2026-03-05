import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { getNextStepCost, GREAT_PERSON_SPOTS, CULTURE_TRACK_MAX, getCultureLevel } from '../../constants/culture';
import { CULTURE_CARD_TEMPLATES } from '../../constants/cultureCards';
import { TECHNOLOGIES } from '../../constants/technologies';
import { Position } from '../../types/map';
import { drawRandomGreatPerson } from '../../constants/greatPerson';

export interface CardTargetingState {
  cardId: string;
  templateId: string;
  step: number;
  data?: any;
}

export interface CultureSlice {
  advanceCultureTrack: () => void;
  drawCultureCard: (level: 1|2|3) => void;
  discardCultureCard: (cardId: string) => void;
  executeCultureCard: (cardId: string, payload: any) => void;
  playCultureCard: (cardId: string, payload: any) => void;

  // [신규] UI 타겟팅 관리
  activeCardTargeting: CardTargetingState | null;
  startCardTargeting: (cardId: string) => void;
  cancelCardTargeting: () => void;
  handleCardMapClick: (position: Position) => void;
}

export const createCultureSlice: StateCreator<GameStore, [["zustand/immer", never]], [], CultureSlice> = (set, get) => ({
  activeCardTargeting: null,

  advanceCultureTrack: () => {
    // 🌟 1. 밖으로 뺄 변수들을 미리 선언합니다.
    let levelToDraw: 1 | 2 | 3 | null = null;
    let limitExceeded = false;
    let currentLimit = 0;

    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const currentTrack = player.cultureTrack;
      if (currentTrack >= CULTURE_TRACK_MAX) return;

      const cost = getNextStepCost(currentTrack);
      if (player.resources.culture < cost.culture || player.resources.trade < cost.trade) {
        alert("자원이 부족합니다.");
        return;
      }

      player.resources.culture -= cost.culture;
      player.resources.trade -= cost.trade;
      player.cultureTrack += 1;
      const newTrack = player.cultureTrack;

      if (GREAT_PERSON_SPOTS.includes(newTrack)) {
        player.greatPeople += 1;
        
        // 🌟 [신규] 랜덤 위인을 뽑아서 플레이어의 대기열(주머니)에 쏙 넣어줍니다!
        if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
        const newGreatPerson = drawRandomGreatPerson();
        player.unplacedGreatPeople.push(newGreatPerson);
        
        alert(`🌟 위인이 탄생했습니다! [${newGreatPerson.type}] 위인이 대기열에 합류합니다.`);
      }else {
        const level = getCultureLevel(newTrack) as 1|2|3;
        const hasPottery = player.technologies.some(t => t.id === 'pottery');
        const hasDemocracy = player.government === 'democracy';
        currentLimit = 2 + (hasPottery ? 1 : 0) + (hasDemocracy ? 1 : 0);

        if (!player.cultureEventCards) player.cultureEventCards = [];

        if (player.cultureEventCards.length >= currentLimit) {
            player.pendingCardDraw = level;
            limitExceeded = true; // 밖에서 처리하기 위해 플래그 설정
        } else {
            levelToDraw = level;  // 밖에서 카드를 뽑기 위해 저장
        }
      }

      if (newTrack === CULTURE_TRACK_MAX) {
        state.winner = player.id;
        state.winCondition = 'culture';
        state.isGameOver = true;
      }
    });

    // 🌟 2. set() 바깥에서 안전하게 카드를 지급하거나 알림을 띄웁니다.
    if (limitExceeded) {
        alert(`카드 한도(${currentLimit}장)를 초과했습니다. 기존 카드를 1장 버려야 새 카드를 얻습니다.`);
    } else if (levelToDraw !== null) {
        get().drawCultureCard(levelToDraw);
    }
  },

  drawCultureCard: (level: 1|2|3) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];

      // cultureEventCards가 null임을 대비하는 안전장치 
      if (!player.cultureEventCards) {
          player.cultureEventCards = [];
      }

      const templates = Object.values(CULTURE_CARD_TEMPLATES).filter(t => t.level === level);
      if (templates.length === 0) return;
      
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      player.cultureEventCards.push({
          id: uuidv4(),
          templateId: randomTemplate.id,
          level: randomTemplate.level,
          name: randomTemplate.name,
          description: randomTemplate.description,
          targetType: randomTemplate.targetType
      });
    });
  },

  discardCultureCard: (cardId: string) => {
    let levelToDraw: 1 | 2 | 3 | null = null;

    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      if (!player.cultureEventCards) return;
      
      const idx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
          player.cultureEventCards.splice(idx, 1);
          // 대기 중인 카드가 있다면 밖에서 뽑도록 levelToDraw에 저장
          if (player.pendingCardDraw !== null) {
              levelToDraw = player.pendingCardDraw as 1|2|3;
              player.pendingCardDraw = null;
          }
      }
    });

    // 🌟 set() 바깥에서 카드 지급 (상태 덮어쓰기 방지)
    if (levelToDraw !== null) {
        get().drawCultureCard(levelToDraw);
    }
  },

  startCardTargeting: (cardId: string) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const card = player.cultureEventCards.find(c => c.id === cardId);
      if (!card) return;
      
      state.activeCardTargeting = {
          cardId: card.id,
          templateId: card.templateId,
          step: 0,
          data: {}
      };
    });
  },

  cancelCardTargeting: () => {
    set((state) => { state.activeCardTargeting = null; });
  },

  handleCardMapClick: (position: Position) => {
    let executePayload: any = null;
    let cardToExecute: string | null = null;

    set((state) => {
      const targeting = state.activeCardTargeting;
      if (!targeting) return;
      const player = state.players[state.currentPlayerIndex];
      const tile = state.map.tiles[position.y][position.x];

      if (targeting.templateId === 'exile') {
          if (targeting.step === 0) {
              // 1. 밀어낼 상대 유닛 선택
              let targetUnitId = null;
              for (const p of state.players) {
                  if (p.id === player.id) continue; // 내 유닛 제외
                  const unit = p.units.find(u => u.position.x === position.x && u.position.y === position.y);
                  if (unit) { targetUnitId = unit.id; break; }
              }
              if (targetUnitId) {
                  targeting.step = 1;
                  targeting.data = { unitId: targetUnitId, originalPos: { ...position } };
              } else {
                  alert("선택한 타일에 상대방의 유닛이 없습니다.");
              }
          } else if (targeting.step === 1) {
              // 2. 4칸 이내의 목적지 선택
              const orig = targeting.data.originalPos;
              const manhattan = Math.abs(position.x - orig.x) + Math.abs(position.y - orig.y); // 상하좌우 이동 칸 수 계산
              
              if (manhattan > 4) {
                  alert("원래 위치에서 4칸 이내의 타일이어야 합니다.");
                  return;
              }
              if (tile.terrain === 'water' || tile.terrain === 'mountain') {
                  alert("물이나 산으로는 이동시킬 수 없습니다.");
                  return;
              }
              if (tile.cityId || tile.buildingType || tile.unitIds.length > 0) {
                  alert("완전히 비어있는 타일로만 이동시킬 수 있습니다.");
                  return;
              }
              
              // 검증 통과
              cardToExecute = targeting.cardId;
              executePayload = { unitId: targeting.data.unitId, targetPos: position };
              state.activeCardTargeting = null;
          }
      }
    });

    if (executePayload && cardToExecute) {
       get().playCultureCard(cardToExecute, executePayload);
    }
  },

  playCultureCard: (cardId: string, payload: any) => {
    // 1. 발동자를 안전하게 찾습니다.
    const state = get();
    const sourcePlayerId = state.players[state.currentPlayerIndex].id;

    let hasMassMedia = false; // 🌟 대중매체 보유 여부 체크 변수

    set((draft) => {
      const player = draft.players.find(p => p.id === sourcePlayerId);
      if (!player) return;
      const card = player.cultureEventCards?.find(c => c.id === cardId);
      
      // 🌟 [패시브 체크] 발동자가 '대중매체(mass_media)' 기술을 가지고 있는지 확인
      hasMassMedia = player.technologies.some(t => t.id === 'mass_media');
      
      if (draft.combatState && !draft.combatState.log) draft.combatState.log = [];
      
      if (hasMassMedia) {
        // 🌟 패시브 발동 로그
        draft.combatState?.log?.push({ 
          message: `📰 ${player.name}이(가) [대중매체]의 언론 통제로 방해 없이 [${card?.name || '카드'}]을(를) 발동했습니다!` 
        });
      } else {
        draft.combatState?.log?.push({ 
          message: `📜 ${player.name}이(가) [${card?.name || '카드'}]을(를) 사용했습니다! (개입 대기 중...)` 
        });
      }
    });

    if (hasMassMedia) {
      // 🌟 대중매체를 보유했다면 큐(Stack)에 올리지 않고, 다른 플레이어 개입 없이 '즉시' 효과를 발동시킵니다.
      get().executeCultureCard(cardId, { ...payload, sourcePlayerId });
    } else {
      // 기존처럼 인터럽트 스택에 올리고 대기합니다.
      get().pushActionToStack({
        id: Date.now().toString(),
        sourcePlayerId: sourcePlayerId,
        actionType: 'culture_card',
        payload: { cardId, ...payload } 
      });
    }
  },

  executeCultureCard: (cardId: string, payload: any) => {
    set((draft) => {
      // 🌟 발동자 정확히 찾기 (스택에서 넘겨준 발동자 ID 사용)
      const playerId = payload.sourcePlayerId || draft.players[draft.currentPlayerIndex].id;
      const player = draft.players.find(p => p.id === playerId);
      if (!player || !player.cultureEventCards) return;

      const cardIdx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return; // 카드가 없으면 중단

      const card = player.cultureEventCards[cardIdx];

      // === 실제 능력 발동 ===
      if (card.templateId === 'exile') {
          const { unitId, targetPos } = payload;
          let targetUnit;
          for (const p of draft.players) {
              targetUnit = p.units.find(u => u.id === unitId);
              if (targetUnit) break;
          }
          if (targetUnit) {
              const oldTile = draft.map.tiles[targetUnit.position.y][targetUnit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
              targetUnit.position = targetPos;
              draft.map.tiles[targetPos.y][targetPos.x].unitIds.push(unitId);
          }
      } 
      else if (card.templateId === 'dictators_day') {
          const { cityId } = payload;
          const city = player.cities.find(c => c.id === cityId);
          if (city) city.tempProductionBonus = (city.tempProductionBonus || 0) + 4;
      } 
      else if (card.templateId === 'idea_share') {
          const { opponentId, techId } = payload;
          const opponent = draft.players.find(p => p.id === opponentId);
          if (opponent && techId) {
              const targetTechDef = TECHNOLOGIES.find(t => t.id === techId);
              if (targetTechDef && !player.technologies.some(t => t.id === techId)) {
                  player.technologies.push({ ...targetTechDef, tokensOnCard: 0, abilityUsedThisTurn: false });
                  const myTier1Techs = player.technologies.filter(t => TECHNOLOGIES.find(td => td.id === t.id)?.level === 1);
                  const validToGive = myTier1Techs.filter(t => !opponent.technologies.some(ot => ot.id === t.id));
                  if (validToGive.length > 0) {
                      const randomTech = validToGive[Math.floor(Math.random() * validToGive.length)];
                      const rTechDef = TECHNOLOGIES.find(t => t.id === randomTech.id);
                      if (rTechDef) {
                          opponent.technologies.push({ ...rTechDef, tokensOnCard: 0, abilityUsedThisTurn: false });
                      }
                  }
              }
          }
      }

      // 🌟 3. 아무 방해 없이 능력을 무사히 썼으므로, 마지막에 카드를 소모(삭제)합니다.
      player.cultureEventCards.splice(cardIdx, 1);
    });
  }
});