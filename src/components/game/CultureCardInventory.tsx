import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { TECHNOLOGIES } from '../../constants/technologies';
import clsx from 'clsx';

export function CultureCardInventory() {
  const { 
    players, currentPlayerIndex, 
    activeCardTargeting, startCardTargeting, cancelCardTargeting, 
    discardCultureCard, executeCultureCard 
  } = useGameStore();

  const player = players[currentPlayerIndex];
  const [isOpen, setIsOpen] = useState(false);

  // === 모달 1: 독재자의 날 (도시 선택) ===
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
                  executeCultureCard(activeCardTargeting.cardId, { cityId: city.id });
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

  // === 모달 2: 발상의 공유 (기술 선택) ===
  const renderIdeaShareModal = () => {
    if (activeCardTargeting?.templateId !== 'idea_share') return null;
    
    const opponents = players.filter(p => p.id !== player.id);
    const availableTechsToSteal: { oppName: string, oppId: string, tech: any }[] = [];
    
    opponents.forEach(opp => {
      const oppTier1Techs = opp.technologies.filter(t => {
         const def = TECHNOLOGIES.find(td => td.id === t.id);
         return def?.level === 1;
      });
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
                  executeCultureCard(activeCardTargeting.cardId, { opponentId: item.oppId, techId: item.tech.id });
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
                  onClick={() => {
                    executeCultureCard(activeCardTargeting.cardId, { opponentId: null, techId: null });
                    cancelCardTargeting();
                  }}
                  className="w-full p-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold"
                >
                  그냥 사용하기 (낭비)
                </button>
            </div>
          )}
          <button onClick={cancelCardTargeting} className="mt-4 w-full p-2 bg-slate-600 hover:bg-slate-500 text-white rounded">취소</button>
        </div>
      </div>
    );
  };

  // === 모달 3: 한도 초과 버리기 강제 (가장 최상위) ===
  const renderDiscardModal = () => {
    // 🌟 수정된 부분: null 뿐만 아니라 undefined일 때도 안전하게 모달을 숨김
    if (!player.pendingCardDraw) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
        <div className="bg-slate-800 p-6 rounded-lg border-2 border-red-500 w-[500px] shadow-2xl">
          <h3 className="text-2xl font-bold text-red-400 mb-2">⚠️ 보유 한도 초과!</h3>
          <p className="text-sm text-slate-300 mb-4">새로운 카드를 획득하기 위해 기존 카드를 1장 버려야 합니다.</p>
          <div className="grid grid-cols-2 gap-3">
            {/* 🌟 수정된 부분: 배열이 비어있을 때를 대비한 방어 코드 추가 */}
            {(player.cultureEventCards || []).map(card => (
              <button 
                key={card.id}
                onClick={() => discardCultureCard(card.id)}
                className="p-3 bg-slate-700 hover:bg-red-900/50 border border-slate-600 hover:border-red-500 rounded text-left transition-colors flex flex-col justify-between h-32"
              >
                <div>
                    <div className="text-purple-300 font-bold mb-1">Lv.{card.level} {card.name}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{card.description}</div>
                </div>
                <div className="text-xs font-bold text-red-400 mt-2 text-right">클릭하여 버리기 🗑️</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderDictatorModal()}
      {renderIdeaShareModal()}
      {renderDiscardModal()}

      {/* 타겟팅 중 안내 배너 (망명 등) */}
      {activeCardTargeting?.templateId === 'exile' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-3 rounded-full font-bold shadow-xl z-40 animate-pulse flex items-center gap-4">
          <span>
            {activeCardTargeting.step === 0 
              ? "🎯 망명: 맵에서 밀어낼 상대방의 유닛을 클릭하세요." 
              : "🗺️ 망명: 유닛이 이동할 4칸 이내의 빈 타일을 클릭하세요."}
          </span>
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
              // absolute bottom-full로 설정해 버튼 위로 열리게 만듭니다
              className="absolute bottom-full mb-4 right-0 bg-slate-800 border-2 border-purple-500/50 rounded-xl p-4 w-80 shadow-2xl flex flex-col gap-3 origin-bottom-right"
            >
              <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
                <h4 className="text-purple-300 font-bold">보유한 이벤트 카드</h4>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              {player.cultureEventCards.map(card => (
                <button 
                  key={card.id}
                  onClick={() => {
                    startCardTargeting(card.id);
                    setIsOpen(false);
                  }}
                  className="p-3 bg-slate-700 hover:bg-purple-900/40 border border-slate-600 hover:border-purple-500 rounded text-left transition-all group"
                >
                  <div className="text-white font-bold mb-1 flex justify-between">
                    <span>{card.name}</span>
                    <span className="text-[10px] bg-purple-600 px-2 py-0.5 rounded-full h-fit">Lv.{card.level}</span>
                  </div>
                  <div className="text-xs text-slate-400 group-hover:text-slate-300">{card.description}</div>
                </button>
              ))}
              {player.cultureEventCards.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6">보유한 카드가 없습니다.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-purple-900/50 transition-transform hover:scale-105 flex items-center gap-2 border border-purple-400/30 whitespace-nowrap"
        >
          <span className="text-xl">🃏</span>
          <span>이벤트 카드 ({player.cultureEventCards.length})</span>
        </button>
      </div>
    </>
  );
}