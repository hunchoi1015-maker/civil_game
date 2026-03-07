// src/store/slices/cultureSlice.ts

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { getNextStepCost, GREAT_PERSON_SPOTS, CULTURE_TRACK_MAX, getCultureLevel } from '../../constants/culture';
import { CULTURE_CARD_TEMPLATES } from '../../constants/cultureCards';
import { TECHNOLOGIES } from '../../constants/technologies';
import { Position } from '../../types/map';
import { drawRandomGreatPerson } from '../../constants/greatPerson';
import { getCultureCardLimit } from '../helpers/playerHelpers'; 

export interface CardTargetingState {
  cardId: string;
  templateId: string;
  step: number;
  data?: any;
}

export interface CultureSlice {
  advanceCultureTrack: () => void;
  advanceCultureTrackFree: () => void;
  drawCultureCard: (level: 1|2|3) => void;
  discardCultureCard: (cardId: string) => void;
  executeCultureCard: (cardId: string, payload: any) => void;
  playCultureCard: (cardId: string, payload: any) => void;
  activeCardTargeting: CardTargetingState | null;
  startCardTargeting: (cardId: string) => void;
  cancelCardTargeting: () => void;
  handleCardMapClick: (position: Position) => void;
}

export const createCultureSlice: StateCreator<GameStore, [["zustand/immer", never]], [], CultureSlice> = (set, get) => ({
  activeCardTargeting: null,

  advanceCultureTrack: () => {
    let levelToDraw: 1 | 2 | 3 | null = null;

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
        if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
        const newGreatPerson = drawRandomGreatPerson();
        player.unplacedGreatPeople.push(newGreatPerson);
        alert(`🌟 위인이 탄생했습니다! [${newGreatPerson.type}] 위인이 대기열에 합류합니다.`);
      } else {
        levelToDraw = getCultureLevel(newTrack) as 1|2|3;
      }

      if (newTrack === CULTURE_TRACK_MAX) {
        state.winner = player.id;
        state.winCondition = 'culture';
        state.isGameOver = true;
      }
    });

    if (levelToDraw !== null) {
        get().drawCultureCard(levelToDraw);
    }
  },

  advanceCultureTrackFree: () => {
    let levelToDraw: 1 | 2 | 3 | null = null;

    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const currentTrack = player.cultureTrack;
      if (currentTrack >= CULTURE_TRACK_MAX) return;

      // 🌟 자원 소모 로직 없이 바로 트랙만 증가시킵니다!
      player.cultureTrack += 1;
      const newTrack = player.cultureTrack;

      if (GREAT_PERSON_SPOTS.includes(newTrack)) {
        player.greatPeople += 1;
        if (!player.unplacedGreatPeople) player.unplacedGreatPeople = [];
        const newGreatPerson = drawRandomGreatPerson();
        player.unplacedGreatPeople.push(newGreatPerson);
        alert(`🌟 [시드니 오페라 하우스] 위인이 탄생했습니다! [${newGreatPerson.type}] 위인이 대기열에 합류합니다.`);
      } else {
        levelToDraw = getCultureLevel(newTrack) as 1|2|3;
      }

      if (!state.combatState.log) state.combatState.log = [];
      state.combatState.log.push({ message: `🎵 [시드니 오페라 하우스] ${player.name}이(가) 무료로 문화 트랙을 1칸 전진했습니다!` });

      if (newTrack === CULTURE_TRACK_MAX) {
        state.winner = player.id;
        state.winCondition = 'culture';
        state.isGameOver = true;
      }
    });

    if (levelToDraw !== null) {
        get().drawCultureCard(levelToDraw);
    }
  },

  drawCultureCard: (level: 1|2|3) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      if (!player.cultureEventCards) player.cultureEventCards = [];
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
      if (!player.cultureEventCards) return;
      const idx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (idx !== -1) player.cultureEventCards.splice(idx, 1);
    });
  },

  startCardTargeting: (cardId: string) => {
    let executeImmediately = false; 
    
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      
      // 🌟 [추가] 카드 사용 시점에 한도 초과 검사! 초과 시 실행 불가
      const currentLimit = getCultureCardLimit(player as any);
      const currentCount = player.cultureEventCards?.length || 0;
      
      if (currentCount > currentLimit) {
          alert(`⚠️ 문화 이벤트 카드 한도(${currentLimit}장)를 초과하여 사용할 수 없습니다. 휴지통(🗑️)을 눌러 카드를 먼저 버려주세요!`);
          return;
      }

      const card = player.cultureEventCards?.find(c => c.id === cardId);
      if (!card) return;

      // 빵과 서커스는 인벤토리에서 직접 클릭해서 쓸 수 없습니다!
      if (card.templateId === 'bread_and_circuses') {
          alert("이 카드는 나를 향한 이벤트 방어(개입) 창에서만 즉시 사용할 수 있습니다.");
          return;
      }

      // 타겟팅이 없는 카드는 즉시 실행 플래그 온
      if (card.targetType === 'none') {
          executeImmediately = true;
          return;
      }
      
      state.activeCardTargeting = { cardId: card.id, templateId: card.templateId, step: 0, data: {} };
    });

    if (executeImmediately) {
        get().playCultureCard(cardId, {});
    }
  },

  cancelCardTargeting: () => { set((state) => { state.activeCardTargeting = null; }); },

  handleCardMapClick: (position: Position) => {
    let executePayload: any = null;
    let cardToExecute: string | null = null;
    
    set((state) => {
      const targeting = state.activeCardTargeting;
      if (!targeting) return;
      
      const player = state.players[state.currentPlayerIndex];
      const tile = state.map.tiles[position.y][position.x];

      // 🌟 [신규] 맨해튼 거리 4칸 이내 판별 헬퍼 함수
      const isWithin4Tiles = (targetPos: Position) => {
          return player.units.some(u => Math.abs(u.position.x - targetPos.x) + Math.abs(u.position.y - targetPos.y) <= 4) ||
                 player.cities.some(c => Math.abs(c.position.x - targetPos.x) + Math.abs(c.position.y - targetPos.y) <= 4);
      };

      if (targeting.templateId === 'exile') {
          if (targeting.step === 0) {
              let targetUnitId = null;
              let targetOwnerId = null;
              for (const p of state.players) {
                  if (p.id === player.id) continue;
                  const unit = p.units.find(u => u.position.x === position.x && u.position.y === position.y);
                  if (unit) { targetUnitId = unit.id; targetOwnerId = p.id; break; }
              }
              if (targetUnitId) {
                  targeting.step = 1;
                  targeting.data = { unitId: targetUnitId, targetPlayerId: targetOwnerId, originalPos: { ...position } };
              } else alert("선택한 타일에 상대방의 유닛이 없습니다.");
          } else if (targeting.step === 1) {
              const orig = targeting.data.originalPos;
              const manhattan = Math.abs(position.x - orig.x) + Math.abs(position.y - orig.y); 
              // 🌟 [수정] 망명 거리가 4칸에서 2칸 이내로 축소되었습니다.
              if (manhattan > 2) { alert("원래 위치에서 2칸 이내의 타일이어야 합니다."); return; }
              if (tile.terrain === 'water' || tile.terrain === 'mountain') { alert("물이나 산으로는 이동시킬 수 없습니다."); return; }
              if (tile.cityId || tile.buildingType || tile.unitIds.length > 0) { alert("완전히 비어있는 타일로만 이동시킬 수 있습니다."); return; }
              
              cardToExecute = targeting.cardId;
              executePayload = { unitId: targeting.data.unitId, targetPlayerId: targeting.data.targetPlayerId, targetPos: position };
              state.activeCardTargeting = null;
          }
      } 
      // 🌟 [신규] 가뭄 타겟팅 로직
      else if (targeting.templateId === 'drought') {
          if (tile.terrain === 'mountain' || tile.buildingType || tile.wonder || tile.cityId) {
              alert("산, 건물, 불가사의, 도시가 있는 칸에는 가뭄을 사용할 수 없습니다."); return;
          }
          cardToExecute = targeting.cardId;
          executePayload = { targetPos: position };
          state.activeCardTargeting = null;
      } 
      // 🌟 [신규] 혼란 타겟팅 로직
      else if (targeting.templateId === 'confusion') {
          if (!isWithin4Tiles(position)) { alert("내 유닛이나 도시에서 4칸 이내여야 합니다."); return; }
          
          let targetUnitId = null;
          let targetOwnerId = null;
          for (const p of state.players) {
              if (p.id === player.id) continue;
              const unit = p.units.find(u => u.position.x === position.x && u.position.y === position.y);
              if (unit) { targetUnitId = unit.id; targetOwnerId = p.id; break; }
          }
          if (!targetUnitId) { alert("선택한 칸에 상대 유닛이 없습니다."); return; }
          
          cardToExecute = targeting.cardId;
          executePayload = { unitId: targetUnitId, targetPlayerId: targetOwnerId };
          state.activeCardTargeting = null;
      } 
      // 🌟 [신규] 사보타주 타겟팅 로직
      else if (targeting.templateId === 'sabotage') {
          if (!isWithin4Tiles(position)) { alert("내 유닛이나 도시에서 4칸 이내여야 합니다."); return; }
          if (tile.ownerId === player.id) { alert("자신의 건물은 파괴할 수 없습니다."); return; }
          if (!tile.ownerId) { alert("주인이 없는 타일입니다."); return; }
          
          let hasTarget = false;
          if (tile.buildingType) hasTarget = true;
          if (tile.cityId) {
              const owner = state.players.find(p => p.id === tile.ownerId);
              const city = owner?.cities.find(c => c.id === tile.cityId);
              if (city?.hasWalls) hasTarget = true; // 성벽도 파괴 대상!
          }
          
          if (!hasTarget) { alert("이 타일에는 파괴할 건물이나 성벽이 없습니다."); return; }

          cardToExecute = targeting.cardId;
          executePayload = { targetPos: position, targetPlayerId: tile.ownerId };
          state.activeCardTargeting = null;
      }
    });

    if (executePayload && cardToExecute) get().playCultureCard(cardToExecute, executePayload);
  },

  playCultureCard: (cardId: string, payload: any) => {
    const state = get();
    const sourcePlayerId = state.players[state.currentPlayerIndex].id;
    let hasMassMedia = false; 
    let limitExceeded = false; // 🌟 최후 방어막 플래그

    set((draft) => {
      const player = draft.players.find(p => p.id === sourcePlayerId);
      if (!player) return;

      // 🌟 [추가] 카드가 발동되는 최후의 순간에도 한도 검사를 수행하여 꼼수 원천 차단
      const currentLimit = getCultureCardLimit(player as any);
      const currentCount = player.cultureEventCards?.length || 0;
      if (currentCount > currentLimit) {
          limitExceeded = true;
          return;
      }

      const card = player.cultureEventCards?.find(c => c.id === cardId);
      hasMassMedia = player.technologies.some(t => t.id === 'mass_media');
      
      if (draft.combatState && !draft.combatState.log) draft.combatState.log = [];
      if (hasMassMedia) {
        draft.combatState?.log?.push({ message: `📰 ${player.name}이(가) [대중매체]의 언론 통제로 방해 없이 [${card?.name || '카드'}]을(를) 발동했습니다!` });
      } else {
        draft.combatState?.log?.push({ message: `📜 ${player.name}이(가) [${card?.name || '카드'}]을(를) 사용했습니다! (개입 대기 중...)` });
      }
    });

    if (limitExceeded) {
        alert("⚠️ 카드 보유 한도를 초과하여 시스템에 의해 발동이 차단되었습니다.");
        return;
    }

    if (hasMassMedia) {
      get().executeCultureCard(cardId, { ...payload, sourcePlayerId });
    } else {
      get().pushActionToStack({ id: Date.now().toString(), sourcePlayerId: sourcePlayerId, actionType: 'culture_card', payload: { cardId, ...payload } });
    }
  },

  executeCultureCard: (cardId: string, payload: any) => {
    set((draft) => {
      const playerId = payload.sourcePlayerId || draft.players[draft.currentPlayerIndex].id;
      const player = draft.players.find(p => p.id === playerId);
      if (!player || !player.cultureEventCards) return;

      const cardIdx = player.cultureEventCards.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return;

      const card = player.cultureEventCards[cardIdx];

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
                      if (rTechDef) opponent.technologies.push({ ...rTechDef, tokensOnCard: 0, abilityUsedThisTurn: false });
                  }
              }
          }
      }// 🌟 [신규] 가뭄 효과
      else if (card.templateId === 'drought') {
          const { targetPos } = payload;
          const tile = draft.map.tiles[targetPos.y][targetPos.x];
          tile.terrain = 'desert';
          tile.resource = 'none';
          tile.object = undefined; // 오두막/마을도 증발
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `☀️ 가뭄이 발생하여 타일(${targetPos.x}, ${targetPos.y})이 영구히 사막으로 변했습니다!` });
      } 
      // 🌟 [신규] 혼란 효과
      else if (card.templateId === 'confusion') {
          const { unitId, targetPlayerId } = payload;
          const targetPlayer = draft.players.find(p => p.id === targetPlayerId);
          if (targetPlayer) {
              const idx = targetPlayer.units.findIndex(u => u.id === unitId);
              if (idx !== -1) {
                  const u = targetPlayer.units[idx];
                  const tile = draft.map.tiles[u.position.y][u.position.x];
                  tile.unitIds = tile.unitIds.filter(id => id !== unitId); // 타일에서 제거
                  targetPlayer.units.splice(idx, 1); // 플레이어 배열에서 제거
                  if (!draft.combatState.log) draft.combatState.log = [];
                  draft.combatState.log.push({ message: `🌀 혼란에 빠진 ${targetPlayer.name}의 유닛이 제거되었습니다!` });
              }
          }
      } 
      // 🌟 [신규] 사보타주 효과
      else if (card.templateId === 'sabotage') {
          const { targetPos, targetPlayerId } = payload;
          const tile = draft.map.tiles[targetPos.y][targetPos.x];
          const targetPlayer = draft.players.find(p => p.id === targetPlayerId);
          if (targetPlayer) {
              let destroyed = false;
              for (const city of targetPlayer.cities) {
                  // 성벽 파괴 확인
                  if (city.position.x === targetPos.x && city.position.y === targetPos.y && city.hasWalls) {
                      city.hasWalls = false;
                      city.cityDefenseBonus = Math.max(0, city.cityDefenseBonus - 2);
                      destroyed = true;
                      if (!draft.combatState.log) draft.combatState.log = [];
                      draft.combatState.log.push({ message: `💥 사보타주! ${city.name}의 성벽이 파괴되었습니다!` });
                      break;
                  }
                  // 일반 건물 파괴 확인
                  if (!destroyed && tile.buildingType) {
                      const bIdx = city.buildings.findIndex(b => b.type === tile.buildingType);
                      if (bIdx !== -1) {
                          city.buildings.splice(bIdx, 1);
                          tile.buildingType = null;
                          destroyed = true;
                          if (!draft.combatState.log) draft.combatState.log = [];
                          draft.combatState.log.push({ message: `💥 사보타주! 상대방의 건물이 파괴되었습니다!` });
                          break;
                      }
                  }
              }
          }
      } 
      // 🌟 [신규] 시민 봉기 효과
      else if (card.templateId === 'civil_uprising') {
          const { targetPlayerId } = payload;
          const targetPlayer = draft.players.find(p => p.id === targetPlayerId);
          if (targetPlayer) {
              targetPlayer.government = 'anarchy';
              targetPlayer.anarchyTurnsLeft = 1; // 1턴간 변경 금지 타이머
              if (!draft.combatState.log) draft.combatState.log = [];
              draft.combatState.log.push({ message: `🔥 ${targetPlayer.name}의 문명에 시민 봉기가 일어나 무정부 상태에 빠졌습니다!` });
          }
      } 
      // 🌟 [신규] 멀리서 온 선물 효과
      else if (card.templateId.startsWith('gift_from_afar')) {
          const { targetPlayerId, resourceType } = payload;
          
          // 1. 나에게 보상 (자원 선택 시 일회성 획득 처리)
          if (resourceType === 'spy') {
              player.spies += 1;
          } else {
              if (!player.secretResources) player.secretResources = [];
              player.secretResources.push({ id: Date.now().toString(), type: resourceType, source: 'hut' });
          }
          
          // 2. 남에게 화폐
          const targetPlayer = draft.players.find(p => p.id === targetPlayerId);
          if (targetPlayer) {
              targetPlayer.resources.currency += 1;
          }
          
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `🎁 ${player.name}이(가) 일회성 자원을 획득하고, ${targetPlayer?.name}에게 화폐 1개를 주었습니다!` });
      }

      player.cultureEventCards.splice(cardIdx, 1);
    });
  }
});