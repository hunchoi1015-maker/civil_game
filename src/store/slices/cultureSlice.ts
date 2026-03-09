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
          targetType: randomTemplate.targetType,
          allowedPhase: randomTemplate.allowedPhase,

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

      // 빵과 서커스 & 마상시합&황금시간대 TV
      if (card.templateId === 'bread_and_circuses' || card.templateId === 'jousting' || card.templateId === 'prime_time_tv') {
          alert("이 카드는 상대가 능력을 썼을 때 방어(개입) 창에서만 사용할 수 있습니다.");
          return;
      }

      // 카드의 허용 단계(Phase) 검사 로직
      if (card.allowedPhase !== 'any' && card.allowedPhase !== state.currentPhase) {
          const phaseNames: Record<string, string> = {
              'start': '차례 시작',
              'trade': '교역',
              'cityManagement': '도시 경영',
              'movement': '이동',
              'research': '기술 연구'
          };
          alert(`⚠️ 이 카드는 [${phaseNames[card.allowedPhase]}] 단계에만 사용할 수 있습니다. (현재: ${phaseNames[state.currentPhase]})`);
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

      // 🌟 [수정] 거리 판별 헬퍼 (인자로 최대 거리 maxDist를 받음)
      const isWithinDistance = (targetPos: Position, maxDist: number) => {
          return player.units.some(u => Math.abs(u.position.x - targetPos.x) + Math.abs(u.position.y - targetPos.y) <= maxDist) ||
                 player.cities.some(c => Math.abs(c.position.x - targetPos.x) + Math.abs(c.position.y - targetPos.y) <= maxDist);
      };
      // 망명
      if (targeting.templateId === 'exile') {
          if (targeting.step === 0) {
              let targetUnitId = null; let targetOwnerId = null;
              for (const p of state.players) {
                  if (p.id === player.id) continue;
                  const unit = p.units.find(u => u.position.x === position.x && u.position.y === position.y);
                  if (unit) { targetUnitId = unit.id; targetOwnerId = p.id; break; }
              }
              if (targetUnitId) { targeting.step = 1; targeting.data = { unitId: targetUnitId, targetPlayerId: targetOwnerId, originalPos: { ...position } }; } 
              else alert("선택한 타일에 상대방의 유닛이 없습니다.");
          } else if (targeting.step === 1) {
              const orig = targeting.data.originalPos;
              const manhattan = Math.abs(position.x - orig.x) + Math.abs(position.y - orig.y); 
              if (manhattan > 2) { alert("원래 위치에서 2칸 이내의 타일이어야 합니다."); return; }
              if (tile.terrain === 'water' || tile.terrain === 'mountain') { alert("물이나 산으로는 이동시킬 수 없습니다."); return; }
              if (tile.cityId || tile.buildingType || tile.unitIds.length > 0) { alert("완전히 비어있는 타일로만 이동시킬 수 있습니다."); return; }
              cardToExecute = targeting.cardId; executePayload = { unitId: targeting.data.unitId, targetPlayerId: targeting.data.targetPlayerId, targetPos: position }; state.activeCardTargeting = null;
          }
      } 
      // 🌟 [신규] 여왕의 날 / 독재자의 날 (내 도시 클릭)
      else if (targeting.templateId === 'queens_day' || targeting.templateId === 'dictators_day') {
          const city = player.cities.find(c => c.position.x === position.x && c.position.y === position.y);
          if (!city) { alert("자신의 도시를 선택해야 합니다."); return; }
          cardToExecute = targeting.cardId; executePayload = { cityId: city.id }; state.activeCardTargeting = null;
      }
      // 🌟 [신규] 산림 벌채 (숲 개간)
      else if (targeting.templateId === 'deforestation') {
          if (tile.terrain !== 'forest') { alert("숲 칸만 선택할 수 있습니다."); return; }
          if (tile.buildingType || tile.wonder || tile.cityId) { alert("건물, 불가사의, 도시가 있는 숲은 벌채할 수 없습니다."); return; }
          cardToExecute = targeting.cardId; executePayload = { targetPos: position }; state.activeCardTargeting = null;
      }
      // 🌟 [신규] 실종 (상대 유닛 무리 이동, 최대 3칸)
      else if (targeting.templateId === 'disappearance') {
          if (targeting.step === 0) {
              const enemyUnits = tile.unitIds.filter(id => { const owner = state.players.find(p => p.units.some(u => u.id === id)); return owner && owner.id !== player.id; });
              if (enemyUnits.length === 0) { alert("선택한 타일에 상대방의 유닛이 없습니다."); return; }
              targeting.step = 1; targeting.data = { originalPos: { ...position } };
          } else if (targeting.step === 1) {
              const orig = targeting.data.originalPos;
              const manhattan = Math.abs(position.x - orig.x) + Math.abs(position.y - orig.y); 
              if (manhattan > 3) { alert("원래 위치에서 3칸 이내의 타일이어야 합니다."); return; }
              if (tile.terrain === 'water' || tile.terrain === 'mountain') { alert("물이나 산으로는 이동시킬 수 없습니다."); return; }
              if (tile.cityId || tile.buildingType || tile.unitIds.length > 0) { alert("완전히 비어있는 타일로만 이동시킬 수 있습니다."); return; }
              cardToExecute = targeting.cardId; 
              // 🌟 [수정] 프록시 객체(orig)가 아니라, 값만 복사해서 안전한 새 객체로 만듭니다!
              executePayload = { 
                  originalPos: { x: orig.x, y: orig.y }, 
                  targetPos: position 
              }; 
              
              state.activeCardTargeting = null;
          }
      }
      // 🌟 [신규] 재앙 (6칸 건물 파괴) & 사보타주 (4칸 건물 파괴)
      else if (targeting.templateId === 'disaster' || targeting.templateId === 'sabotage') {
          const dist = targeting.templateId === 'disaster' ? 6 : 4;
          if (!isWithinDistance(position, dist)) { alert(`내 유닛이나 도시에서 ${dist}칸 이내여야 합니다.`); return; }
          if (tile.ownerId === player.id) { alert("자신의 건물은 파괴할 수 없습니다."); return; }
          if (!tile.ownerId) { alert("주인이 없는 타일입니다."); return; }
          
          let hasTarget = false;
          if (tile.buildingType) hasTarget = true;
          if (tile.cityId) {
              const owner = state.players.find(p => p.id === tile.ownerId);
              const city = owner?.cities.find(c => c.id === tile.cityId);
              if (city?.hasWalls) hasTarget = true; 
          }
          if (!hasTarget) { alert("이 타일에는 파괴할 건물이나 성벽이 없습니다."); return; }
          cardToExecute = targeting.cardId; executePayload = { targetPos: position, targetPlayerId: tile.ownerId }; state.activeCardTargeting = null;
      }
      // 가뭄, 혼란 유지
      else if (targeting.templateId === 'drought') {
          if (tile.terrain === 'mountain' || tile.buildingType || tile.wonder || tile.cityId) { alert("산, 건물, 불가사의, 도시가 있는 칸에는 가뭄을 사용할 수 없습니다."); return; }
          cardToExecute = targeting.cardId; executePayload = { targetPos: position }; state.activeCardTargeting = null;
      } 
      else if (targeting.templateId === 'confusion') {
          if (!isWithinDistance(position, 4)) { alert("내 유닛이나 도시에서 4칸 이내여야 합니다."); return; }
          let targetUnitId = null; let targetOwnerId = null;
          for (const p of state.players) { if (p.id === player.id) continue; const unit = p.units.find(u => u.position.x === position.x && u.position.y === position.y); if (unit) { targetUnitId = unit.id; targetOwnerId = p.id; break; } }
          if (!targetUnitId) { alert("선택한 칸에 상대 유닛이 없습니다."); return; }
          cardToExecute = targeting.cardId; executePayload = { unitId: targetUnitId, targetPlayerId: targetOwnerId }; state.activeCardTargeting = null;
      }
      // 🌟 지휘권 붕괴 (4칸 실종)
      else if (targeting.templateId === 'command_collapse') {
          if (targeting.step === 0) {
              const enemyUnits = tile.unitIds.filter(id => { const owner = state.players.find(p => p.units.some(u => u.id === id)); return owner && owner.id !== player.id; });
              if (enemyUnits.length === 0) { alert("상대 유닛이 없습니다."); return; }
              targeting.step = 1; targeting.data = { originalPos: { ...position } };
          } else if (targeting.step === 1) {
              const orig = targeting.data.originalPos;
              const manhattan = Math.abs(position.x - orig.x) + Math.abs(position.y - orig.y); 
              if (manhattan > 4) { alert("4칸 이내여야 합니다."); return; } // 4칸!
              if (tile.terrain === 'water' || tile.terrain === 'mountain' || tile.cityId || tile.buildingType || tile.unitIds.length > 0) { 
                  alert("완전히 비어있는 평지/숲/사막으로만 이동시킬 수 있습니다."); return; 
              }
              cardToExecute = targeting.cardId; executePayload = { originalPos: {x: orig.x, y: orig.y}, targetPos: position }; state.activeCardTargeting = null;
          }
      }
      // 🌟 대규모 망명 (직접 2개 클릭)
      else if (targeting.templateId === 'mass_asylum') {
          const targets = targeting.data?.targets || [];
          let found = false;
          for (const p of state.players) {
              if (p.id === player.id) continue;
              if (p.units.some(u => u.position.x === position.x && u.position.y === position.y)) found = true;
              if ((p as any).placedGreatPeople?.some((gp:any) => gp.position && gp.position.x === position.x && gp.position.y === position.y)) found = true;
          }
          if (!found) { alert("해당 칸에 상대방의 유닛이나 위인이 없습니다."); return; }
          
          const newTargets = [...targets, { x: position.x, y: position.y }];
          if (newTargets.length === 2) {
              cardToExecute = targeting.cardId; 
              // 🌟 [핵심 수정] 프록시 에러 방지를 위해 값을 복사해서 넘깁니다!
              executePayload = { targets: newTargets.map(t => ({ x: t.x, y: t.y })) }; 
              state.activeCardTargeting = null;
          } else {
              targeting.data = { targets: newTargets }; // 1개 담고 다음 클릭 대기
          }
      }
      // 🌟 대재앙 (직접 건물 2개 클릭)
      else if (targeting.templateId === 'cataclysm') {
          const targets = targeting.data?.targets || [];
          if (tile.ownerId === player.id) { alert("자신의 건물은 파괴 불가!"); return; }
          if (!tile.ownerId) { alert("주인이 없는 타일입니다."); return; }
          
          let hasTarget = false;
          if (tile.buildingType) hasTarget = true;
          if (tile.cityId) {
              const owner = state.players.find(p => p.id === tile.ownerId);
              if (owner?.cities.find(c => c.id === tile.cityId)?.hasWalls) hasTarget = true;
          }
          if (!hasTarget) { alert("이곳엔 파괴할 상대 건물/성벽이 없습니다."); return; }
          
          const newTargets = [...targets, { x: position.x, y: position.y, targetPlayerId: tile.ownerId }];
          if (newTargets.length === 2) {
              cardToExecute = targeting.cardId; 
              // 🌟 [핵심 수정] 프록시 에러 방지를 위해 값을 복사!
              executePayload = { targets: newTargets.map(t => ({ x: t.x, y: t.y, targetPlayerId: t.targetPlayerId })) }; 
              state.activeCardTargeting = null;
          } else {
              targeting.data = { targets: newTargets };
          }
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
      get().pushActionToStack({ id: Date.now().toString(),
         sourcePlayerId: sourcePlayerId, 
         actionType: 'culture_card', payload: { cardId, ...payload } });
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
      else if (card.templateId === 'idea_share' || card.templateId === 'knowledge_sharing' || card.templateId === 'think_tank') {
          // techId: 내가 배울 기술, opponentTechId: 상대가 배울 기술
          const { opponentId, techId, opponentTechId } = payload;
          const opponent = draft.players.find(p => p.id === opponentId);
          
          if (opponent) {
              let learnedSomething = false;
              
              // 1. 내가 선택한 기술 획득 (스킵하지 않았다면)
              if (techId && !player.technologies.some(t => t.id === techId)) {
                  const tDef = TECHNOLOGIES.find(t => t.id === techId);
                  if (tDef) {
                      player.technologies.push({ ...tDef, tokensOnCard: 0, abilityUsedThisTurn: false });
                      learnedSomething = true;
                  }
              }
              
              // 2. 상대방이 선택한 기술 획득 (스킵하지 않았다면)
              if (opponentTechId && !opponent.technologies.some(t => t.id === opponentTechId)) {
                  const tDef = TECHNOLOGIES.find(t => t.id === opponentTechId);
                  if (tDef) {
                      opponent.technologies.push({ ...tDef, tokensOnCard: 0, abilityUsedThisTurn: false });
                      learnedSomething = true;
                  }
              }
              
              if (!draft.combatState.log) draft.combatState.log = [];
              if (learnedSomething) {
                  draft.combatState.log.push({ message: `💡 [${card.name}] ${player.name}와(과) ${opponent.name}이(가) 과학 동맹으로 지식을 교환했습니다!` });
              } else {
                  draft.combatState.log.push({ message: `💡 [${card.name}] 서로 조건이 맞지 않아 아무 지식도 얻지 못했습니다.` });
              }
          }
      }
      // 🌟 [신규] 가뭄 효과
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
      // 🌟 [추가] 풍족한 선물 효과 
      else if (card.templateId === 'bountiful_gift') {
          const { resourceType } = payload;
          if (resourceType === 'spy') {
              player.spies += 1;
          } else {
              if (!player.secretResources) player.secretResources = [];
              player.secretResources.push({ id: Date.now().toString(), type: resourceType, source: 'hut' });
          }
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `🎁 ${player.name}이(가) [풍족한 선물] 카드를 사용해 즉시 보상을 획득했습니다!` });
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
      else if (card.templateId === 'queens_day' || card.templateId === 'dictators_day') {
          const { cityId } = payload;
          const city = player.cities.find(c => c.id === cityId);
          if (city) {
               const bonus = card.templateId === 'queens_day' ? 6 : 4;
               city.tempProductionBonus = (city.tempProductionBonus || 0) + bonus;
               if (!draft.combatState.log) draft.combatState.log = [];
               draft.combatState.log.push({ message: `👑 [${card.name}] ${city.name}의 생산력이 이번 턴 동안 +${bonus} 증가합니다.` });
          }
      }
      // 🌟 [신규] 산림 벌채 (자원은 보존)
      else if (card.templateId === 'deforestation') {
          const { targetPos } = payload;
          const tile = draft.map.tiles[targetPos.y][targetPos.x];
          tile.terrain = 'grassland'; // 자원(resource)과 마을(object)은 건드리지 않음
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `🪓 산림 벌채! 타일(${targetPos.x}, ${targetPos.y})이 초원으로 개간되었습니다.` });
      }
      // 🌟 [신규] 실종 (무리 단위 이동)
      else if (card.templateId === 'disappearance') {
          const { originalPos, targetPos } = payload;
          const oldTile = draft.map.tiles[originalPos.y][originalPos.x];
          const newTile = draft.map.tiles[targetPos.y][targetPos.x];
          
          const unitsToMove: string[] = [];
          for (const p of draft.players) {
              if (p.id === playerId) continue; // 내 것은 안 옮김
              const enemyUnitsHere = p.units.filter(u => u.position.x === originalPos.x && u.position.y === originalPos.y);
              enemyUnitsHere.forEach(u => {
                  u.position = { ...targetPos };
                  unitsToMove.push(u.id);
              });
          }
          oldTile.unitIds = oldTile.unitIds.filter(id => !unitsToMove.includes(id));
          newTile.unitIds.push(...unitsToMove);

          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `👻 실종 발생! 상대방의 유닛 무리가 흔적도 없이 다른 곳으로 밀려났습니다!` });
      }
      // 🌟 [신규] 재앙 (사보타주 로직과 사실상 동일하므로 합침)
      else if (card.templateId === 'disaster' || card.templateId === 'sabotage') {
          const { targetPos, targetPlayerId } = payload;
          const tile = draft.map.tiles[targetPos.y][targetPos.x];
          const targetPlayer = draft.players.find(p => p.id === targetPlayerId);
          if (targetPlayer) {
              let destroyed = false;
              for (const city of targetPlayer.cities) {
                  if (city.position.x === targetPos.x && city.position.y === targetPos.y && city.hasWalls) {
                      city.hasWalls = false;
                      city.cityDefenseBonus = Math.max(0, city.cityDefenseBonus - 2);
                      destroyed = true;
                      if (!draft.combatState.log) draft.combatState.log = [];
                      draft.combatState.log.push({ message: `💥 [${card.name}] ${city.name}의 성벽이 파괴되었습니다!` });
                      break;
                  }
                  if (!destroyed && tile.buildingType) {
                      const bIdx = city.buildings.findIndex(b => b.type === tile.buildingType);
                      if (bIdx !== -1) {
                          city.buildings.splice(bIdx, 1);
                          tile.buildingType = null;
                          destroyed = true;
                          if (!draft.combatState.log) draft.combatState.log = [];
                          draft.combatState.log.push({ message: `💥 [${card.name}] 상대방의 건물이 파괴되었습니다!` });
                          break;
                      }
                  }
              }
          }
      }
      // 🌟 [신규] 집단 망명 (최대 2개 제거)
      else if (card.templateId === 'mass_exile') {
          const { targetUnitIds } = payload;
          for (const unitId of targetUnitIds) {
              for (const p of draft.players) {
                  if (p.id === playerId) continue;
                  
                  // 1. 일반 유닛 제거 시도
                  const uIdx = p.units.findIndex(u => u.id === unitId);
                  if (uIdx !== -1) {
                      const u = p.units[uIdx];
                      const tile = draft.map.tiles[u.position.y][u.position.x];
                      tile.unitIds = tile.unitIds.filter(id => id !== unitId);
                      p.units.splice(uIdx, 1);
                      if (!draft.combatState.log) draft.combatState.log = [];
                      draft.combatState.log.push({ message: `🌪️ 집단 망명! ${p.name}의 유닛이 맵에서 제거되었습니다.` });
                      continue;
                  }
                  
                  // 2. 만약 위인을 타일에 배치하는 별도 배열(placedGreatPeople 등)이 있다면 여기서 제거!
                  // (유저님의 위인 맵 배치 로직에 따라 이 부분은 자동 대응되도록 안전하게 작성합니다)
                  if ((p as any).placedGreatPeople) {
                      const gpIdx = (p as any).placedGreatPeople.findIndex((gp:any) => gp.id === unitId);
                      if (gpIdx !== -1) {
                          (p as any).placedGreatPeople.splice(gpIdx, 1);
                          if (!draft.combatState.log) draft.combatState.log = [];
                          draft.combatState.log.push({ message: `🌪️ 집단 망명! ${p.name}의 위인이 맵에서 제거되었습니다.` });
                      }
                  }
              }
          }
      }
      // 🌟 대통령의 날, 여왕의 날, 독재자의 날 (통합)
      else if (card.templateId === 'presidents_day' || card.templateId === 'queens_day' || card.templateId === 'dictators_day') {
          const { cityId } = payload;
          const city = player.cities.find(c => c.id === cityId);
          if (city) {
               const bonus = card.templateId === 'presidents_day' ? 8 : (card.templateId === 'queens_day' ? 6 : 4);
               city.tempProductionBonus = (city.tempProductionBonus || 0) + bonus;
               if (!draft.combatState.log) draft.combatState.log = [];
               draft.combatState.log.push({ message: `👑 [${card.name}] ${city.name}의 생산력이 이번 턴 동안 +${bonus} 증가합니다.` });
          }
      }
      // 🌟 고귀한 선물, 풍족한 선물 (통합)
      else if (card.templateId === 'bountiful_gift' || card.templateId === 'noble_gift') {
          const { resourceType } = payload;
          
          if (resourceType === 'spy') {
              player.spies += 1;
          } else if (resourceType === 'nuclearMaterial') {
              // 🌟 우라늄을 선택하면 전용 핵 자원(nuclearMaterial) 증가!
              player.nuclearMaterial = (player.nuclearMaterial || 0) + 1;
          } else {
              if (!player.secretResources) player.secretResources = [];
              // 다른 자원들은 기존처럼 secretResources 배열에 들어감
              player.secretResources.push({ id: Date.now().toString(), type: resourceType, source: 'hut' });
          }
          
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `🎁 ${player.name}이(가) [${card.name}]을 사용해 비밀 자원을 획득했습니다!` });
      }
      // 🌟 지휘권 붕괴 (4칸 무리 이동)
      else if (card.templateId === 'command_collapse') {
          const { originalPos, targetPos } = payload;
          const oldTile = draft.map.tiles[originalPos.y][originalPos.x];
          const newTile = draft.map.tiles[targetPos.y][targetPos.x];
          const unitsToMove: string[] = [];
          
          for (const p of draft.players) {
              if (p.id === playerId) continue;
              const enemyUnitsHere = p.units.filter(u => u.position.x === originalPos.x && u.position.y === originalPos.y);
              enemyUnitsHere.forEach(u => { u.position = { ...targetPos }; unitsToMove.push(u.id); });
          }
          oldTile.unitIds = oldTile.unitIds.filter(id => !unitsToMove.includes(id));
          newTile.unitIds.push(...unitsToMove);
          if (!draft.combatState.log) draft.combatState.log = [];
          draft.combatState.log.push({ message: `📡 [지휘권 붕괴] 적 부대가 강제로 멀리 이동당했습니다!` });
      }
      // 🌟 대규모 망명
      else if (card.templateId === 'mass_asylum') {
          const { targets } = payload;
          targets.forEach((pos: any) => {
              for (const p of draft.players) {
                  if (p.id === playerId) continue;
                  const uIdx = p.units.findIndex(u => u.position.x === pos.x && u.position.y === pos.y);
                  if (uIdx !== -1) {
                      const u = p.units[uIdx];
                      const tile = draft.map.tiles[u.position.y][u.position.x];
                      tile.unitIds = tile.unitIds.filter(id => id !== u.id);
                      p.units.splice(uIdx, 1);
                      draft.combatState.log?.push({ message: `🌪️ [대규모 망명] ${p.name}의 유닛이 제거되었습니다!` });
                      continue; // 타일당 하나씩만 제거
                  }
                  if ((p as any).placedGreatPeople) {
                      const gpIdx = (p as any).placedGreatPeople.findIndex((gp:any) => gp.position && gp.position.x === pos.x && gp.position.y === pos.y);
                      if (gpIdx !== -1) {
                          (p as any).placedGreatPeople.splice(gpIdx, 1);
                          draft.combatState.log?.push({ message: `🌪️ [대규모 망명] ${p.name}의 위인이 제거되었습니다!` });
                      }
                  }
              }
          });
      }
      // 🌟 대재앙
      else if (card.templateId === 'cataclysm') {
          const { targets } = payload;
          targets.forEach((target: any) => {
              const tile = draft.map.tiles[target.y][target.x];
              const targetPlayer = draft.players.find(p => p.id === target.targetPlayerId);
              if (targetPlayer) {
                  let destroyed = false;
                  for (const city of targetPlayer.cities) {
                      if (city.position.x === target.x && city.position.y === target.y && city.hasWalls) {
                          city.hasWalls = false; city.cityDefenseBonus = Math.max(0, city.cityDefenseBonus - 2);
                          destroyed = true; draft.combatState.log?.push({ message: `🌋 [대재앙] ${city.name}의 성벽이 무너졌습니다!` });
                          break;
                      }
                      if (!destroyed && tile.buildingType) {
                          const bIdx = city.buildings.findIndex(b => b.type === tile.buildingType);
                          if (bIdx !== -1) {
                              city.buildings.splice(bIdx, 1); tile.buildingType = null;
                              destroyed = true; draft.combatState.log?.push({ message: `🌋 [대재앙] 건물이 파괴되었습니다!` });
                              break;
                          }
                      }
                  }
              }
          });
      }

      player.cultureEventCards.splice(cardIdx, 1);
    });
  }
  
});