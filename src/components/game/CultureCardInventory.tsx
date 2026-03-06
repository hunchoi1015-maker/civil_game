// src/components/game/CultureCardInventory.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { TECHNOLOGIES } from '../../constants/technologies';
import clsx from 'clsx';
import { getCultureCardLimit } from '../../store/helpers/playerHelpers'; 

export function CultureCardInventory() {
  const { 
    players, currentPlayerIndex, 
    activeCardTargeting, startCardTargeting, cancelCardTargeting, 
    discardCultureCard, playCultureCard 
  } = useGameStore();

  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);

  // 🌟 한도 초과 상태 계산
  const currentLimit = getCultureCardLimit(player);
  const currentCount = player.cultureEventCards?.length || 0;
  const isOverLimit = currentCount > currentLimit;

  // === 모달 1: 독재자의 날 ===
  const renderDictatorModal = () => {
    if (activeCardTargeting?.templateId !== 'dictators_day') return null;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
        <div className="bg-slate-800 p-6 rounded-lg border border-purple-500 w-96">
          <h3 className="text-xl font-bold text-white mb-4">🏛️ 대상 도시 선택</h3>
          <p className="text-sm text-slate-300 mb-4">이번 턴에 생산력 보너스(+4)를 받을 내 도시를 선택하세요.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {player.cities.map(city => (
              <button 
                key={city.id}
                onClick={() => {
                  playCultureCard(activeCardTargeting.cardId, { cityId: city.id });
                  cancelCardTargeting();
                }}
                className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded text-left text-white font-bold transition-colors flex justify-between"
              >
                <span>{city.name}</span>
                <span className="text-xs text-amber-400">생산력 +4</span>
              </button>
            ))}
            {player.cities.length === 0 && <p className="text-slate-500 py-2">도시가 없습니다.</p>}
          </div>
          <button onClick={cancelCardTargeting} className="mt-4 w-full p-2 bg-slate-600 hover:bg-slate-500 text-white rounded">취소</button>
        </div>
      </div>
    );
  };

  // === 모달 2: 발상의 공유 ===
  const renderIdeaShareModal = () => {
    if (activeCardTargeting?.templateId !== 'idea_share') return null;
    const opponents = players.filter(p => p.id !== player.id);
    const availableTechsToSteal: { oppName: string, oppId: string, tech: any }[] = [];
    
    opponents.forEach(opp => {
      const oppTier1Techs = opp.technologies.filter(t => TECHNOLOGIES.find(td => td.id === t.id)?.level === 1);
      oppTier1Techs.forEach(t => {
        if (!player.technologies.some(myT => myT.id === t.id)) {
          availableTechsToSteal.push({ oppName: opp.name, oppId: opp.id, tech: t });
        }
      });
    });

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
        <div className="bg-slate-800 p-6 rounded-lg border border-purple-500 w-[500px]">
          <h3 className="text-xl font-bold text-white mb-4">💡 기술 교환 대상 선택</h3>
          <p className="text-sm text-slate-300 mb-4">뺏어올 상대의 1단계 기술을 선택하세요. (대신 내 기술 1개가 무작위로 넘어갑니다)</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {availableTechsToSteal.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  playCultureCard(activeCardTargeting.cardId, { opponentId: item.oppId, techId: item.tech.id });
                  cancelCardTargeting();
                }}
                className="w-full p-3 bg-slate-700 hover:bg-slate-600 flex justify-between rounded text-white transition-colors"
              >
                <span className="font-bold">{item.tech.name}</span>
                <span className="text-slate-400 text-sm">from {item.oppName}</span>
              </button>
            ))}
          </div>
          {availableTechsToSteal.length === 0 && (
            <div className="mt-2 p-3 bg-red-900/30 border border-red-500 rounded text-center">
                <p className="text-amber-400 text-sm mb-3">뺏어올 수 있는 기술이 없어 카드가 낭비됩니다.</p>
                <button 
                  onClick={() => { playCultureCard(activeCardTargeting.cardId, { opponentId: null, techId: null }); cancelCardTargeting(); }}
                  className="w-full p-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold"
                >그냥 사용하기 (낭비)</button>
            </div>
          )}
          <button onClick={cancelCardTargeting} className="mt-4 w-full p-2 bg-slate-600 hover:bg-slate-500 text-white rounded">취소</button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderDictatorModal()}
      {renderIdeaShareModal()}

      {activeCardTargeting?.templateId === 'exile' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-3 rounded-full font-bold shadow-xl z-40 animate-pulse flex items-center gap-4">
          <span>{activeCardTargeting.step === 0 ? "🎯 망명: 맵에서 밀어낼 유닛을 클릭" : "🗺️ 망명: 유닛이 이동할 빈 타일 클릭"}</span>
          <button onClick={cancelCardTargeting} className="bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-sm">취소</button>
        </div>
      )}

      {/* 하단 우측 플로팅 인벤토리 */}
      <div className="relative flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full mb-4 right-0 bg-slate-800 border-2 border-purple-500/50 rounded-xl p-4 w-[340px] shadow-2xl flex flex-col gap-3 origin-bottom-right z-50"
            >
              <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
                <h4 className="text-purple-300 font-bold">보유한 이벤트 카드</h4>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {/* 🌟 한도 초과 경고 메시지 */}
              {isOverLimit && (
                <div className="bg-red-900/60 border border-red-500 rounded p-3 text-xs text-white mb-2 shadow-inner">
                  <span className="font-bold text-red-400 text-sm">⚠️ 사용 불가 (한도 초과)</span><br/>
                  현재 <span className="text-amber-400 font-bold">{currentCount} / {currentLimit}장</span> 입니다.<br/>
                  우측 휴지통(🗑️)을 눌러 카드를 버려야만 다른 카드를 사용할 수 있습니다.
                </div>
              )}

              <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                {player.cultureEventCards?.map(card => (
                  <div key={card.id} className="flex gap-2">
                    
                    {/* 카드 본체 (초과 시 클릭 불가능하게 어둡게 처리) */}
                    <button 
                      onClick={() => {
                        if (isOverLimit) {
                            alert(`보유 한도를 초과했습니다. 휴지통을 눌러 카드를 버려주세요.`);
                            return;
                        }
                        startCardTargeting(card.id);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        "flex-1 p-3 rounded text-left transition-all group border",
                        isOverLimit 
                          ? "bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed" 
                          : "bg-slate-700 hover:bg-purple-900/40 border-slate-600 hover:border-purple-500"
                      )}
                    >
                      <div className="text-white font-bold mb-1 flex justify-between">
                        <span>{card.name}</span>
                        <span className="text-[10px] bg-purple-600 px-2 py-0.5 rounded-full h-fit">Lv.{card.level}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-tight">{card.description}</div>
                    </button>

                    {/* 🌟 휴지통 버튼 (항상 활성화) */}
                    <button
                      onClick={() => discardCultureCard(card.id)}
                      className="w-10 flex items-center justify-center bg-slate-700 hover:bg-red-600 border border-slate-600 hover:border-red-500 rounded transition-colors text-lg"
                      title="카드 버리기"
                    >
                      🗑️
                    </button>

                  </div>
                ))}
              </div>
              
              {currentCount === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6">보유한 카드가 없습니다.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🌟 메인 토글 버튼 상태 표시 */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            "px-6 py-3 rounded-full font-bold shadow-lg transition-transform flex items-center gap-2 whitespace-nowrap",
            isOverLimit 
              ? "bg-red-900 hover:bg-red-800 text-red-200 border-2 border-red-500 shadow-red-900/50 animate-pulse" 
              : "bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-purple-900/50 border border-purple-400/30 hover:scale-105"
          )}
        >
          <span className="text-xl">🃏</span>
          {isOverLimit ? (
            <span>⚠️ 이벤트 카드 잠김 ({currentCount}/{currentLimit})</span>
          ) : (
            <span>이벤트 카드 ({currentCount}/{currentLimit})</span>
          )}
        </button>
      </div>
    </>
  );
}