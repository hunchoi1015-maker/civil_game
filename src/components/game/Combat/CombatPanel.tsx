// src/components/game/Combat/CombatPanel.tsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import {
  ArmyCard,
  ARMY_CARD_DEFINITIONS,
  Battlefield,
  LOOT_MAX_PER_SELECTION,
} from '../../../types';
import clsx from 'clsx';
import { hasActiveWonder } from '../../../store/helpers/playerHelpers';

const CARD_ICONS: Record<string, string> = {
  infantry: '🗡️',
  artillery: '💣',
  cavalry: '🐴',
  airforce: '✈️',
};

function CardDisplay({ card, selected, onClick, disabled, size = 'normal' }: {
  card: ArmyCard;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'normal' | 'small';
}) {
  const def = ARMY_CARD_DEFINITIONS[card.type];
  const isDead = card.health <= 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled || isDead}
      className={clsx(
        'rounded-lg text-left transition-all border-2',
        size === 'normal' ? 'p-3' : 'p-2',
        isDead && 'opacity-30 grayscale',
        selected
          ? 'border-amber-400 bg-amber-600/30'
          : disabled
            ? 'border-slate-600 bg-slate-700/50 cursor-not-allowed'
            : 'border-slate-600 bg-slate-700 hover:bg-slate-600 hover:border-slate-500',
      )}
    >
      <div className="flex items-center gap-2">
        <span className={size === 'normal' ? 'text-xl' : 'text-base'}>{CARD_ICONS[card.type]}</span>
        <div className="flex-1 min-w-0">
          <div className={clsx('font-medium text-white truncate', size === 'small' && 'text-xs')}>
            {card.name}
          </div>
          <div className={clsx('opacity-75', size === 'normal' ? 'text-xs' : 'text-[10px]')}>
            <span className="text-red-300">공격: {card.attack}</span>
            <span className="mx-1">|</span>
            <span className="text-green-300">체력: {card.health}/{card.maxHealth}</span>
          </div>
          {size === 'normal' && (
            <div className="text-xs text-slate-400">{def.description}</div>
          )}
        </div>
      </div>
    </button>
  );
}

function BattlefieldSlot({ bf, isAttackerTurn, onFaceCard }: {
  bf: Battlefield;
  isAttackerTurn: boolean;
  onFaceCard: (bfId: string) => void;
}) {
  const canFace = bf.resolved
    ? false
    : isAttackerTurn
      ? !bf.attackerCard && !!bf.defenderCard
      : !bf.defenderCard && !!bf.attackerCard;

  return (
    <div className={clsx(
      'flex flex-col items-center gap-1 p-2 rounded-lg border min-w-[120px]',
      bf.resolved ? 'border-slate-600 bg-slate-800/50' : 'border-slate-500 bg-slate-700/50',
      canFace && 'ring-2 ring-amber-400 cursor-pointer hover:bg-slate-600/50',
    )}
      onClick={() => canFace && onFaceCard(bf.id)}
    >
      <div className="w-full">
        {bf.attackerCard ? (
          <div className={clsx(
            'p-1.5 rounded text-xs',
            bf.result && !bf.result.attackerSurvived ? 'bg-red-900/50 line-through' : 'bg-red-800/30',
          )}>
            <div className="flex items-center gap-1">
              <span>{CARD_ICONS[bf.attackerCard.type]}</span>
              <span className="text-white truncate">{bf.attackerCard.name}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              공격:{bf.attackerCard.attack} 체력:{bf.attackerCard.health}
            </div>
          </div>
        ) : (
          <div className="p-1.5 rounded bg-slate-800 text-xs text-slate-500 text-center">
            공격 슬롯
          </div>
        )}
      </div>

      <div className="text-xs font-bold text-amber-500">
        {bf.resolved ? (bf.result?.firstStriker === 'simultaneous' ? '⚡' : '⚔️') : 'VS'}
      </div>

      <div className="w-full">
        {bf.defenderCard ? (
          <div className={clsx(
            'p-1.5 rounded text-xs',
            bf.result && !bf.result.defenderSurvived ? 'bg-blue-900/50 line-through' : 'bg-blue-800/30',
          )}>
            <div className="flex items-center gap-1">
              <span>{CARD_ICONS[bf.defenderCard.type]}</span>
              <span className="text-white truncate">{bf.defenderCard.name}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              공격:{bf.defenderCard.attack} 체력:{bf.defenderCard.health}
            </div>
          </div>
        ) : (
          <div className="p-1.5 rounded bg-slate-800 text-xs text-slate-500 text-center">
            방어 슬롯
          </div>
        )}
      </div>

      {bf.resolved && bf.result && (
        <div className="text-[10px] text-slate-400">
          {bf.result.firstStriker === 'attacker' && '공격 선제'}
          {bf.result.firstStriker === 'defender' && '방어 선제'}
          {bf.result.firstStriker === 'simultaneous' && '동시 공격'}
        </div>
      )}
    </div>
  );
}

// === 배치 단계 ===
function PlacementPhase() {
  const {
    combatState,
    players,
    placeCardOnBattlefield,
    passTurn,
    applyCombatSkill,
    map 
  } = useGameStore();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  // 🌟 [수정] 금속가공 버프 사용 소스를 구별하기 위한 상태 ('none' | 'luxury' | 'secret')
  const [metalCastingSource, setMetalCastingSource] = useState<'none' | 'luxury' | 'secret'>('none');
  
  // 🌟 [수정] 모달에서도 오두막 자원 사용 여부를 기억하도록 추가
  const [skillModal, setSkillModal] = useState<{
    isOpen: boolean;
    skillId: string;
    maxPoints: number;
    type: 'damage' | 'heal';
    useSecretResource?: boolean; 
  } | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const cs = combatState;
  const attackerPlayer = players.find((p) => p.id === cs.attackerRoleId);
  const defenderPlayer = players.find((p) => p.id === cs.defenderRoleId);

  if (!attackerPlayer) return null;

  const isAttackerTurn = cs.placement.currentTurn === 'attacker';
  const currentTurnPlayer = isAttackerTurn 
      ? attackerPlayer 
      : (defenderPlayer || { id: 'village', name: '원주민 마을', color: 'gray' } as any);

  const opponentPlayer = isAttackerTurn ? defenderPlayer : attackerPlayer;
  const opponentCards = isAttackerTurn ? cs.defenderAvailableCards : cs.attackerAvailableCards;
  
  const hasOracle = map ? hasActiveWonder(currentTurnPlayer.id, 'oracle', map, players) : false;

  const usedSkills = cs.usedCombatSkills?.[currentTurnPlayer.id] || [];
  const hasTech = (techId: string) => currentTurnPlayer.technologies?.some((t: any) => t.id === techId);
  const hasUsedInCombat = (techId: string) => usedSkills.includes(techId); 

  // 🌟 [추가] 일반 철 사치품 개수와 오두막 철 토큰 개수를 따로 계산
  const ironCount = currentTurnPlayer.luxuryResources?.iron || 0;
  const secretIronCount = currentTurnPlayer.secretResources?.filter((r: any) => r.type === 'iron').length || 0;
  
  const hasMetalCasting = hasTech('metal_casting') && !hasUsedInCombat('metal_casting');

  // 자원이 변동되면 선택된 버프 소스 초기화
  useEffect(() => {
    if (metalCastingSource === 'luxury' && ironCount < 1) setMetalCastingSource('none');
    if (metalCastingSource === 'secret' && secretIronCount < 1) setMetalCastingSource('none');
  }, [ironCount, secretIronCount, metalCastingSource]);

  const currentCards = isAttackerTurn ? cs.attackerAvailableCards : cs.defenderAvailableCards;
  const currentDeployCount = isAttackerTurn ? cs.placement.attackerDeployCount : cs.placement.defenderDeployCount;
  const currentMaxCards = isAttackerTurn ? cs.placement.attackerMaxCards : cs.placement.defenderMaxCards;

  const handlePlaceCard = (battlefieldId: string | null) => {
    if (!selectedCard) return;

    // 카드를 낼 때 금속가공 버프가 켜져있다면, 선택된 소스를 applyCombatSkill에 넘겨 지불 처리
    if (metalCastingSource !== 'none') {
      applyCombatSkill(currentTurnPlayer.id, 'metal_casting', undefined, selectedCard, metalCastingSource === 'secret');
      setMetalCastingSource('none');
    }

    placeCardOnBattlefield(currentTurnPlayer.id, selectedCard, battlefieldId);
    setSelectedCard(null);
  };

  const handlePass = () => {
    passTurn(currentTurnPlayer.id);
    setSelectedCard(null);
  };

  const faceable = cs.battlefields.filter((bf) =>
    isAttackerTurn ? (!bf.attackerCard && !!bf.defenderCard) : (!bf.defenderCard && !!bf.attackerCard)
  );

  return (
    <div className="space-y-6 relative">
      {cs.rolesSwapped && (
        <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-3 text-center">
          <p className="text-amber-400 text-sm">⚠️ 성벽 도시/수도 방어! 역할이 교환되었습니다.</p>
          <p className="text-slate-400 text-xs mt-1">
            도시 소유자({attackerPlayer.name})가 공격 역할, 이동자({defenderPlayer?.name})가 방어 역할
          </p>
        </div>
      )}

      <div className="text-center">
        <div className={clsx(
          'inline-block px-4 py-2 rounded-lg font-semibold',
          isAttackerTurn ? 'bg-red-600/30 text-red-400' : 'bg-blue-600/30 text-blue-400',
        )}>
          {currentTurnPlayer.name}의 배치 턴
        </div>
        <p className="text-xs text-slate-400 mt-1">
          배치: {currentDeployCount} / {currentMaxCards} | 방어자 먼저 배치
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">전장</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {cs.battlefields.map((bf) => (
            <BattlefieldSlot
              key={bf.id}
              bf={bf}
              isAttackerTurn={isAttackerTurn}
              onFaceCard={(bfId) => handlePlaceCard(bfId)}
            />
          ))}
          {cs.battlefields.length === 0 && (
            <div className="text-slate-500 text-sm py-4 text-center w-full">아직 배치된 카드가 없습니다</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        
        {/* 1열: 내 카드 */}
        <div>
          <h3 className={clsx('text-lg font-semibold mb-3', isAttackerTurn ? 'text-red-400' : 'text-blue-400')}>
            {isAttackerTurn ? '⚔️' : '🛡️'} {currentTurnPlayer.name}의 카드
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {currentCards.length === 0 ? (
              <p className="text-slate-500 text-sm">사용 가능한 카드 없음</p>
            ) : (
              currentCards.map((card) => (
                <CardDisplay
                  key={card.id}
                  card={card}
                  selected={selectedCard === card.id}
                  onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
                  disabled={currentDeployCount >= currentMaxCards}
                />
              ))
            )}
          </div>
        </div>

        {/* 2열: 행동 선택 */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-300">행동 선택</h3>

          {/* 🌟 [UI 개편] 금속가공 버프: 일반 철과 비밀 철을 구분하여 선택 가능하게 만듦 */}
          {hasMetalCasting && (
            <div className="flex flex-col gap-2 mb-2 p-2 bg-slate-800/80 rounded-lg border border-slate-700">
               <div className="text-xs text-amber-300 font-bold mb-1 flex items-center gap-1"><span>🔨</span> 금속가공 버프 선택</div>
               {ironCount > 0 && (
                  <label className={clsx(
                    "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border",
                    metalCastingSource === 'luxury' ? "border-amber-400 bg-amber-900/30" : "border-slate-600 bg-slate-700"
                  )}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={metalCastingSource === 'luxury'}
                      onChange={() => setMetalCastingSource(p => p === 'luxury' ? 'none' : 'luxury')}
                    />
                    <div className="flex-1 text-[11px] font-bold text-slate-300">
                      사치품 철 소모 (+3 공격력)
                    </div>
                  </label>
               )}
               {secretIronCount > 0 && (
                  <label className={clsx(
                    "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border",
                    metalCastingSource === 'secret' ? "border-purple-400 bg-purple-900/30" : "border-slate-600 bg-slate-700"
                  )}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={metalCastingSource === 'secret'}
                      onChange={() => setMetalCastingSource(p => p === 'secret' ? 'none' : 'secret')}
                    />
                    <div className="flex-1 text-[11px] font-bold text-slate-300">
                      오두막 철 소모 (+3 공격력)
                    </div>
                  </label>
               )}
               {ironCount === 0 && secretIronCount === 0 && (
                  <div className="text-[10px] text-slate-500 text-center py-1">소모할 철이 없습니다.</div>
               )}
            </div>
          )}

          {selectedCard && (
            <>
              <button
                onClick={() => handlePlaceCard(null)}
                className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-colors"
              >
                새 전장 슬롯에 배치
              </button>

              {faceable.length > 0 && (
                <p className="text-xs text-slate-400">또는 위 전장에서 상대 카드를 클릭하여 맞대기</p>
              )}
            </>
          )}

          {!selectedCard && currentCards.length > 0 && currentDeployCount < currentMaxCards && (
            <p className="text-sm text-slate-400">왼쪽에서 카드를 선택하세요</p>
          )}

          <button
            onClick={handlePass}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
          >
            패스
          </button>

          {currentTurnPlayer.id !== 'village' && (
            <div className="mt-2 pt-4 border-t border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-2">전투 스킬 (현재 턴)</h4>
              <div className="flex flex-col gap-2">
                
                {/* 🌟 [UI 개편] 수학: 버튼을 반으로 갈라 지불 방식 선택 */}
                {hasTech('mathematics') && !hasUsedInCombat('mathematics') && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSkillModal({ isOpen: true, skillId: 'mathematics', maxPoints: 3, type: 'damage', useSecretResource: false }); setAllocations({}); }}
                      disabled={ironCount < 1}
                      className="flex-1 p-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded text-[11px] disabled:opacity-50 transition-colors border border-rose-700/50"
                    >
                      📐 수학 (사치품 철)
                    </button>
                    <button 
                      onClick={() => { setSkillModal({ isOpen: true, skillId: 'mathematics', maxPoints: 3, type: 'damage', useSecretResource: true }); setAllocations({}); }}
                      disabled={secretIronCount < 1}
                      className="flex-1 p-2 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded text-[11px] disabled:opacity-50 transition-colors border border-purple-700/50"
                    >
                      📐 수학 (오두막 철)
                    </button>
                  </div>
                )}

                {/* 🌟 [UI 개편] 탄도학: 버튼을 반으로 갈라 지불 방식 선택 */}
                {hasTech('ballistics') && !hasUsedInCombat('ballistics') && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSkillModal({ isOpen: true, skillId: 'ballistics', maxPoints: 6, type: 'damage', useSecretResource: false }); setAllocations({}); }}
                      disabled={ironCount < 1}
                      className="flex-1 p-2 bg-rose-700/50 hover:bg-rose-600 text-rose-100 rounded text-[11px] disabled:opacity-50 transition-colors border border-rose-600/50"
                    >
                      🚀 탄도학 (사치품 철)
                    </button>
                    <button 
                      onClick={() => { setSkillModal({ isOpen: true, skillId: 'ballistics', maxPoints: 6, type: 'damage', useSecretResource: true }); setAllocations({}); }}
                      disabled={secretIronCount < 1}
                      className="flex-1 p-2 bg-indigo-700/50 hover:bg-indigo-600 text-indigo-100 rounded text-[11px] disabled:opacity-50 transition-colors border border-indigo-600/50"
                    >
                      🚀 탄도학 (오두막 철)
                    </button>
                  </div>
                )}

                {hasTech('animal_husbandry') && !hasUsedInCombat('animal_husbandry') && (
                  <button 
                    onClick={() => { setSkillModal({ isOpen: true, skillId: 'animal_husbandry', maxPoints: 3, type: 'heal' }); setAllocations({}); }}
                    className="w-full px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 rounded text-sm text-left transition-colors border border-emerald-700/50"
                  >
                    🥩 축산 (무료): 치료 3 분배
                  </button>
                )}

                {hasTech('biology') && !hasUsedInCombat('biology') && (
                  <button 
                    onClick={() => applyCombatSkill(currentTurnPlayer.id, 'biology')}
                    className="w-full px-3 py-2 bg-teal-900/50 hover:bg-teal-800 text-teal-200 rounded text-sm text-left font-bold transition-colors border border-teal-600/50"
                  >
                    🌿 생물학 (무료): 전장 모든 부대 완치
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3열: 상대방 패 렌더링 (신탁 여부에 따라 공개/비공개) */}
        <div className="pl-4 border-l border-slate-700">
          <h3 className="text-lg font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <span>👀</span>
            <span className="truncate">{opponentPlayer?.name || '적'}의 남은 패</span>
            <span className="text-sm bg-slate-800 px-2 py-0.5 rounded-full">{opponentCards.length}장</span>
          </h3>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {opponentCards.map((card, idx) => (
               hasOracle ? (
                  <CardDisplay key={card.id} card={card} disabled size="small" />
               ) : (
                  <div key={idx} className="p-3 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center h-14 opacity-50">
                     <span className="text-slate-500 font-bold text-sm">카드 뒷면 (숨겨짐)</span>
                  </div>
               )
            ))}
            {opponentCards.length === 0 && <p className="text-slate-500 text-sm text-center py-4">남은 카드 없음</p>}
          </div>

          {hasOracle && opponentCards.length > 0 && (
             <div className="mt-3 text-xs text-purple-300 font-bold bg-purple-900/50 p-2 rounded text-center border border-purple-700/50 animate-pulse">
                👁️ 신탁 효과: 상대 패 강제 공개
             </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mt-6">
        <div className="bg-slate-800 rounded p-2">
          <span className="text-red-400">공격 전투 보너스: +{cs.attackerCombatBonus}</span>
        </div>
        <div className="bg-slate-800 rounded p-2">
          <span className="text-blue-400">방어 전투 보너스: +{cs.defenderCombatBonus}</span>
          {cs.defenderCityDefenseBonus > 0 && (
            <span className="text-green-400 ml-2">도시 방어: +{cs.defenderCityDefenseBonus}</span>
          )}
        </div>
      </div>

      {/* 스킬 포인트 분배 모달 */}
      {skillModal?.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
          <div className="bg-slate-800 border-2 border-amber-500 rounded-xl p-6 w-[450px] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              {skillModal.type === 'damage' ? '💥 데미지 분배' : '✨ 회복 분배'}
              {skillModal.useSecretResource && <span className="text-xs bg-purple-800 px-2 py-1 rounded-full text-purple-200 ml-2">오두막 토큰 결제 대기중</span>}
            </h3>
            
            {(() => {
              const usedPoints = Object.values(allocations).reduce((a, b) => a + b, 0);
              const remainingPoints = skillModal.maxPoints - usedPoints;

              return (
                <>
                  <p className="text-amber-400 font-bold mb-4 flex justify-between">
                    <span>남은 포인트: <span className="text-2xl">{remainingPoints}</span> / {skillModal.maxPoints}</span>
                    <span className="text-sm text-slate-400 mt-1">
                      {skillModal.type === 'damage' ? '(적 전장 카드 대상)' : '(내 전장 카드 대상)'}
                    </span>
                  </p>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-6">
                    {cs.battlefields.map(bf => {
                      const targetCard = skillModal.type === 'damage' 
                        ? (isAttackerTurn ? bf.defenderCard : bf.attackerCard)
                        : (isAttackerTurn ? bf.attackerCard : bf.defenderCard);
                      
                      if (!targetCard) return null;

                      const currentAlloc = allocations[bf.id] || 0;
                      const maxPossible = skillModal.type === 'damage' 
                        ? targetCard.health 
                        : (targetCard.maxHealth - targetCard.health);

                      if (maxPossible <= 0) return null;

                      return (
                        <div key={bf.id} className="flex justify-between items-center bg-slate-700 p-3 rounded border border-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{CARD_ICONS[targetCard.type]}</span>
                            <div>
                              <div className="text-white font-bold text-sm">{targetCard.name}</div>
                              <div className="text-xs text-slate-400">
                                체력: {targetCard.health}/{targetCard.maxHealth}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setAllocations(p => ({ ...p, [bf.id]: Math.max(0, currentAlloc - 1) }))}
                              disabled={currentAlloc === 0}
                              className="w-8 h-8 rounded bg-slate-600 hover:bg-slate-500 text-white font-bold disabled:opacity-30"
                            >-</button>
                            <span className={clsx("w-6 text-center font-bold text-lg", skillModal.type === 'damage' ? 'text-red-400' : 'text-green-400')}>
                              {currentAlloc}
                            </span>
                            <button 
                              onClick={() => setAllocations(p => ({ ...p, [bf.id]: currentAlloc + 1 }))}
                              disabled={remainingPoints === 0 || currentAlloc >= maxPossible}
                              className="w-8 h-8 rounded bg-slate-600 hover:bg-slate-500 text-white font-bold disabled:opacity-30"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                    {cs.battlefields.every(bf => {
                       const tc = skillModal.type === 'damage' 
                        ? (isAttackerTurn ? bf.defenderCard : bf.attackerCard)
                        : (isAttackerTurn ? bf.attackerCard : bf.defenderCard);
                       if (!tc) return true;
                       return skillModal.type === 'damage' ? tc.health <= 0 : tc.health >= tc.maxHealth;
                    }) && (
                      <p className="text-center text-slate-400 py-4">
                        대상 카드가 없습니다.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSkillModal(null)}
                      className="flex-1 p-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded"
                    >
                      취소
                    </button>
                    <button 
                      onClick={() => {
                        // 🌟 [수정] 모달이 기억하던 지불 방식을 그대로 스토어에 전달합니다.
                        applyCombatSkill(currentTurnPlayer.id, skillModal.skillId, allocations, undefined, skillModal.useSecretResource);
                        setSkillModal(null);
                      }}
                      disabled={usedPoints === 0}
                      className="flex-1 p-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded"
                    >
                      적용하기
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// === 해결/점수 단계 ===
function ResolutionPhase() {
  const { combatState, players, resolveBattlefieldsAction } = useGameStore();

  useEffect(() => {
    if (combatState.phase === 'resolution') {
      resolveBattlefieldsAction();
    }
  }, [combatState.phase, resolveBattlefieldsAction]);

  const cs = combatState;
  const attackerPlayer = players.find((p) => p.id === cs.attackerRoleId);
  
  if (!attackerPlayer) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-amber-500">전투 해결</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
        {cs.battlefields.map((bf) => (
          <BattlefieldSlot
            key={bf.id}
            bf={bf}
            isAttackerTurn={false}
            onFaceCard={() => {}}
          />
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg p-4 max-h-[200px] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">전투 로그</h3>
        {cs.log.map((entry, i) => (
          <p key={i} className="text-xs text-slate-400 mb-1">{entry.message}</p>
        ))}
      </div>

      {cs.graveyard.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">전사한 카드</h3>
          <div className="flex gap-2 flex-wrap">
            {cs.graveyard.map((card) => (
              <div key={card.id} className="text-xs bg-slate-700 rounded px-2 py-1 opacity-50">
                {CARD_ICONS[card.type]} {card.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CombatScoreTooltip({ 
  baseScore, 
  combatBonus, 
  defenseBonus, 
  label 
}: { baseScore: number, combatBonus: number, defenseBonus: number, label: string }) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 p-3 rounded text-xs w-48 z-20 border border-slate-600 shadow-xl">
      <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">{label} 전투력 상세</div>
      <div className="flex justify-between mb-1">
        <span className="text-slate-400">유닛 공격력 합:</span>
        <span className="font-mono">{baseScore}</span>
      </div>
      <div className="flex justify-between mb-1 text-blue-400">
        <span>+ 전역 보너스:</span>
        <span className="font-mono">+{combatBonus}</span>
      </div>
      {defenseBonus > 0 && (
        <div className="flex justify-between mb-1 text-green-400">
          <span>+ 도시 방어:</span>
          <span className="font-mono">+{defenseBonus}</span>
        </div>
      )}
      <div className="border-t border-slate-600 mt-2 pt-1 flex justify-between font-bold text-amber-400 text-sm">
        <span>최종 전투력:</span>
        <span>{baseScore + combatBonus + defenseBonus}</span>
      </div>
    </div>
  );
}

// === 점수 단계 ===
function ScoringPhase() {
  const { combatState, players, proceedToLoot } = useGameStore();
  const cs = combatState;

  const attackerPlayer = players.find((p) => p.id === cs.attackerRoleId);
  const defenderPlayer = players.find((p) => p.id === cs.defenderRoleId);
  const winnerPlayer = players.find((p) => p.id === cs.winnerPlayerId);

  const defenderName = defenderPlayer ? defenderPlayer.name : '원주민 마을';
  
  if (!attackerPlayer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold text-center">
        {winnerPlayer ? (
          <span className={cs.winnerPlayerId === cs.attackerRoleId ? 'text-red-400' : 'text-blue-400'}>
            🏆 {winnerPlayer.name} 승리!
          </span>
        ) : (
          <span className="text-blue-400">🏆 {defenderName} 승리!</span>
        )}
      </h2>
      
      <div className="w-full bg-slate-800/50 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">최종 전장 상황</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 justify-center min-h-[120px] items-center">
          {cs.battlefields.map((bf) => (
            <div key={bf.id} className="relative scale-90">
               <BattlefieldSlot
                  bf={bf}
                  isAttackerTurn={false}
                  onFaceCard={() => {}}
                />
            </div>
          ))}
          {cs.battlefields.length === 0 && (
            <div className="text-slate-500 text-sm">
              교전 기록이 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-lg p-4 text-center relative group cursor-help">
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            ⚔️ {attackerPlayer.name} (공격)
          </h3>
          <div className="text-4xl font-bold text-white mb-2">{cs.attackerFinalScore}</div>
          <div className="text-xs text-slate-500">마우스를 올려 상세 정보 확인</div>
          
          <div className="hidden group-hover:block transition-opacity">
            <CombatScoreTooltip 
              baseScore={cs.attackerFinalScore - cs.attackerCombatBonus - cs.attackerCityDefenseBonus}
              combatBonus={cs.attackerCombatBonus}
              defenseBonus={cs.attackerCityDefenseBonus}
              label="공격자"
            />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            🛡️ {defenderName} (방어)
          </h3>
          <div className="text-3xl font-bold text-white mb-2">{cs.defenderFinalScore}</div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>카드 공격력 합: {cs.defenderFinalScore - cs.defenderCombatBonus - cs.defenderCityDefenseBonus}</p>
            <p>전투 보너스: +{cs.defenderCombatBonus}</p>
            {cs.defenderCityDefenseBonus > 0 && (
              <p>도시 방어 보너스: +{cs.defenderCityDefenseBonus}</p>
            )}
          </div>
        </div>
      </div>

      {cs.attackerFinalScore === cs.defenderFinalScore && (
        <p className="text-center text-sm text-slate-400">
          동점! 이동자(공격 측)가 패배합니다.
        </p>
      )}

      <div className="flex justify-center">
        <button
          onClick={proceedToLoot}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
        >
          계속
        </button>
      </div>
    </motion.div>
  );
}

// === 전리품 단계 ===
function LootPhase() {
  const { combatState, players, selectLoot } = useGameStore();
  const cs = combatState;

  const winnerPlayer = players.find((p) => p.id === cs.winnerPlayerId);
  const loserPlayer = players.find((p) => p.id === cs.loserPlayerId);

  if (!winnerPlayer || !loserPlayer) return null;

  const remaining = cs.maxLootSelections - cs.lootSelections.length;
  const loserTrade = loserPlayer.resources.trade;
  const loserCulture = loserPlayer.resources.culture;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-center text-amber-500">전리품 선택</h2>

      <p className="text-center text-slate-300">
        {winnerPlayer.name}이(가) {loserPlayer.name}로부터 자원을 획득합니다.
      </p>
      <p className="text-center text-sm text-slate-400">
        남은 선택: {remaining} / {cs.maxLootSelections}
      </p>

      {cs.lootSelections.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">선택 완료</h3>
          {cs.lootSelections.map((loot, i) => (
            <p key={i} className="text-sm text-amber-400">
              {loot.type === 'trade' ? '💰 교역' : '🎵 문화'} +{loot.amount}
            </p>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => selectLoot('trade')}
            disabled={loserTrade <= 0}
            className={clsx(
              'px-6 py-4 rounded-lg font-semibold transition-colors',
              loserTrade > 0
                ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            )}
          >
            <div>💰 교역</div>
            <div className="text-sm">+{Math.min(LOOT_MAX_PER_SELECTION, loserTrade)}</div>
            <div className="text-xs opacity-75">상대 보유: {loserTrade}</div>
          </button>

          <button
            onClick={() => selectLoot('culture')}
            disabled={loserCulture <= 0}
            className={clsx(
              'px-6 py-4 rounded-lg font-semibold transition-colors',
              loserCulture > 0
                ? 'bg-purple-700 hover:bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            )}
          >
            <div>🎵 문화</div>
            <div className="text-sm">+{Math.min(LOOT_MAX_PER_SELECTION, loserCulture)}</div>
            <div className="text-xs opacity-75">상대 보유: {loserCulture}</div>
          </button>

          <div className="w-full max-w-2xl mt-4 border-t border-slate-700 pt-6 flex justify-center">
          <button
              onClick={() => selectLoot('mercy')}
              className="px-8 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors flex items-center gap-2 font-medium"
          >
              <span>🕊️</span>
              <span>자비 베풀기 (아무것도 가져가지 않고 종료)</span>
          </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// === 결과 단계 ===
function ResultPhase() {
  const { combatState, players, endCombat } = useGameStore();
  const cs = combatState;

  const winnerPlayer = players.find((p) => p.id === cs.winnerPlayerId);
  const isCapitalCapture = cs.combatType === 'capital' && cs.winnerPlayerId === cs.originalMoverId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {isCapitalCapture ? (
        <div className="text-center py-8">
          <h2 className="text-4xl font-bold text-red-500 mb-4">군사 승리!</h2>
          <p className="text-xl text-amber-400">
            {winnerPlayer?.name}이(가) 적의 수도를 점령하여 군사 승리를 달성했습니다!
          </p>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-300 mb-2">전투 종료</h2>
          {cs.combatType === 'city' && cs.winnerPlayerId === cs.originalMoverId && (
            <p className="text-amber-400">도시를 점령했습니다!</p>
          )}

          {cs.defenderRoleId === 'village' && cs.winnerPlayerId === cs.originalMoverId && (
            <p className="text-amber-400 text-lg font-bold mt-2">
               마을을 정복했습니다! <br/>
               <span className="text-sm text-slate-400 font-normal">획득한 보상은 전투 종료 시 인벤토리에 추가됩니다.</span>
            </p>
          )}
          
          {cs.winnerPlayerId !== cs.originalMoverId && (
            <p className="text-slate-400">공격이 격퇴되었습니다.</p>
          )}

          {cs.lootSelections.length > 0 && (
            <div className="mt-4 bg-slate-800 rounded-lg p-3 inline-block">
              <h3 className="text-sm font-semibold text-amber-400 mb-1">획득 전리품</h3>
              {cs.lootSelections.map((loot, i) => (
                <p key={i} className="text-sm text-white">
                  {loot.type === 'trade' ? '💰 교역' : '🎵 문화'} +{loot.amount}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={endCombat}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors"
        >
          {isCapitalCapture ? '게임 종료' : '전투 종료'}
        </button>
      </div>
    </motion.div>
  );
}

// === 메인 전투 패널 ===
export function CombatPanel() {
  const { combatState, players, endCombat } = useGameStore();
  const cs = combatState;

  const attackerPlayer = players.find((p) => p.id === cs.attackerRoleId);
  const originalMover = players.find((p) => p.id === cs.originalMoverId);
  const originalDefender = players.find((p) => p.id === cs.originalDefenderId);

  if (!attackerPlayer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white">전투 정보를 불러올 수 없습니다.</p>
        <button onClick={endCombat} className="ml-4 px-4 py-2 bg-red-600 text-white rounded">
          닫기
        </button>
      </div>
    );
  }
  
  const originalMoverName = originalMover ? originalMover.name : '알 수 없음';
  const originalDefenderName = originalDefender ? originalDefender.name : '원주민 마을';

  const combatTypeLabel =
    cs.combatType === 'capital' ? '수도 전투' :
    cs.combatType === 'city' ? '도시 전투' : '야전';

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500 mb-2">전투!</h1>
          <p className="text-slate-400">
            {originalMoverName} vs {originalDefenderName}
          </p>
          <span className={clsx(
            'inline-block mt-2 px-3 py-1 rounded text-sm font-semibold',
            cs.combatType === 'capital' ? 'bg-red-900/50 text-red-400' :
            cs.combatType === 'city' ? 'bg-amber-900/50 text-amber-400' :
            'bg-slate-700 text-slate-300',
          )}>
            {combatTypeLabel}
          </span>
        </div>

        {cs.phase === 'placement' && <PlacementPhase />}
        {cs.phase === 'resolution' && <ResolutionPhase />}
        {cs.phase === 'scoring' && <ScoringPhase />}
        {cs.phase === 'loot' && <LootPhase />}
        {cs.phase === 'result' && <ResultPhase />}
      </div>
    </div>
  );
}