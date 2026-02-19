import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { getNextStepCost, GREAT_PERSON_SPOTS, CULTURE_TRACK_MAX, getCultureLevel } from '../../constants/culture';
import { CULTURE_CARD_TEMPLATES } from '../../constants/cultureCards';
import { TECHNOLOGIES } from '../../constants/technologies';
import { Position } from '../../types/map';

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
  
  // [신규] UI 타겟팅 관리
  activeCardTargeting: CardTargetingState | null;
  startCardTargeting: (cardId: string) => void;
  cancelCardTargeting: () => void;
  handleCardMapClick: (position: Position) => void;
}

export const createCultureSlice: StateCreator<GameStore, [["zustand/immer", never]], [], CultureSlice> = (set, get) => ({
  activeCardTargeting: null,

  advanceCultureTrack: () => {
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
        player.pendingGreatPerson = true;
        alert("위인이 탄생했습니다!");
      } else {
        const level = getCultureLevel(newTrack) as 1|2|3;
        const hasPottery = player.technologies.some(t => t.id === 'pottery');
        const hasDemocracy = player.government === 'democracy';
        const cardLimit = 2 + (hasPottery ? 1 : 0) + (hasDemocracy ? 1 : 0);

        if (player.cultureEventCards.length >= cardLimit) {
            player.pendingCardDraw = level;
        } else {
            get().drawCultureCard(level);
        }
      }

      if (newTrack === CULTURE_TRACK_MAX) {
        state.winner = player.id;
        state.winCondition = 'culture';
        state.isGameOver = true;
      }
    });
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
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const idx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
          player.cultureEventCards.splice(idx, 1);
          if (player.pendingCardDraw !== null) {
              const levelToDraw = player.pendingCardDraw as 1|2|3;
              player.pendingCardDraw = null;
              get().drawCultureCard(levelToDraw);
          }
      }
    });
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
       get().executeCultureCard(cardToExecute, executePayload);
    }
  },

  executeCultureCard: (cardId: string, payload: any) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const cardIdx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return;
      const card = player.cultureEventCards[cardIdx];

      if (card.templateId === 'exile') {
          const { unitId, targetPos } = payload;
          let targetUnit;
          for (const p of state.players) {
              targetUnit = p.units.find(u => u.id === unitId);
              if (targetUnit) break;
          }
          if (targetUnit) {
              const oldTile = state.map.tiles[targetUnit.position.y][targetUnit.position.x];
              oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
              targetUnit.position = targetPos;
              state.map.tiles[targetPos.y][targetPos.x].unitIds.push(unitId);
          }
      } 
      else if (card.templateId === 'dictators_day') {
          const { cityId } = payload;
          const city = player.cities.find(c => c.id === cityId);
          if (city) city.tempProductionBonus = (city.tempProductionBonus || 0) + 4;
      } 
      else if (card.templateId === 'idea_share') {
          const { opponentId, techId } = payload;
          const opponent = state.players.find(p => p.id === opponentId);
          if (opponent && techId) {
              const targetTechDef = TECHNOLOGIES.find(t => t.id === techId);
              if (targetTechDef && !player.technologies.some(t => t.id === techId)) {
                  player.technologies.push({ ...targetTechDef, isResearched: true });
                  
                  // 내 1단계 기술 무작위로 넘겨주기
                  const myTier1Techs = player.technologies.filter(t => {
                      const def = TECHNOLOGIES.find(td => td.id === t.id);
                      return def?.level === 1; // 1단계 기술
                  });
                  const validToGive = myTier1Techs.filter(t => !opponent.technologies.some(ot => ot.id === t.id));
                  
                  if (validToGive.length > 0) {
                      const randomTech = validToGive[Math.floor(Math.random() * validToGive.length)];
                      const rTechDef = TECHNOLOGIES.find(t => t.id === randomTech.id);
                      if (rTechDef) opponent.technologies.push({ ...rTechDef, isResearched: true });
                  }
              }
          }
      }

      player.cultureEventCards.splice(cardIdx, 1);
    });
  }
});