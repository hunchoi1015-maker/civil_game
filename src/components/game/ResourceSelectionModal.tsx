import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { ResourceType } from '../../types/map';
import clsx from 'clsx';

const RESOURCE_EMOJIS: Record<Exclude<ResourceType, 'none'>, string> = {
  wheat: '🌾',
  iron: '⛏️',
  silk: '👘',
  spice: '🌶️',
};

const RESOURCE_NAMES: Record<Exclude<ResourceType, 'none'>, string> = {
  wheat: '밀',
  iron: '철',
  silk: '비단',
  spice: '향료',
};

export function ResourceSelectionModal() {
  const { 
    players, 
    currentPlayerIndex, 
    resourceSelectionMode, 
    cancelResourceSelection,
    useTechResourceAbility,
    addToast 
  } = useGameStore();

  const player = players[currentPlayerIndex];
  
  // 내가 선택한 자원 개수를 임시로 저장하는 바구니
  const [selected, setSelected] = useState<Record<string, number>>({
    wheat: 0, iron: 0, silk: 0, spice: 0
  });

  // 모달이 열릴 때 바구니 초기화
  useEffect(() => {
    if (resourceSelectionMode?.isActive) {
      setSelected({ wheat: 0, iron: 0, silk: 0, spice: 0 });
    }
  }, [resourceSelectionMode?.isActive]);

  if (!resourceSelectionMode?.isActive) return null;

  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
  const requiredAmount = resourceSelectionMode.requiredAmount;

  const handleAdd = (resKey: string) => {
    // 요구치보다 많이 담을 수 없고, 내가 가진 자원보다 많이 담을 수 없음
    if (totalSelected >= requiredAmount) return;
    if (selected[resKey] >= player.luxuryResources[resKey as Exclude<ResourceType, 'none'>]) return;
    setSelected(prev => ({ ...prev, [resKey]: prev[resKey] + 1 }));
  };

  const handleSub = (resKey: string) => {
    if (selected[resKey] <= 0) return;
    setSelected(prev => ({ ...prev, [resKey]: prev[resKey] - 1 }));
  };

  const handleConfirm = () => {
    if (totalSelected !== requiredAmount) {
      addToast(`자원 ${requiredAmount}개를 정확히 선택해주세요.`);
      return;
    }
    // 진짜로 스킬 발동! (어떤 자원을 선택했는지 Payload에 담아 보냅니다)
    useTechResourceAbility(resourceSelectionMode.techId!, { consumedResources: selected });
    cancelResourceSelection();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md font-serif">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="panel-texture border-amber-500/50 rounded-2xl p-7 max-w-sm w-full shadow-2xl"
        >
          <div className="panel-content">
            <div className="flex justify-between items-center mb-5 border-b border-amber-700/30 pb-3">
              <h2 className="text-2xl font-black text-amber-400 text-glow-gold flex items-center gap-2"><span>⚖️</span> 자원 지불</h2>
              <button onClick={cancelResourceSelection} className="text-slate-400 hover:text-amber-400 text-2xl transition-colors">✕</button>
            </div>
            
            <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-900/50 shadow-inner text-center mb-6">
              <p className="text-amber-100/80 text-sm mb-2">
                스킬을 사용하기 위해 임의의 자원 <strong className="font-cinzel text-amber-400 text-lg mx-1">{requiredAmount}</strong>개를 지불하십시오.
              </p>
              <div className="text-sm font-bold mt-2">
                선택된 자원: <span className="font-cinzel text-2xl text-amber-400 text-glow-gold ml-2">{totalSelected}</span> 
                <span className="font-cinzel text-amber-200/50 ml-1">/ {requiredAmount}</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {Object.keys(selected).map((resKey) => {
                const myAmount = player.luxuryResources[resKey as Exclude<ResourceType, 'none'>];
                const selAmount = selected[resKey];
                
                return (
                  <div key={resKey} className={clsx(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    selAmount > 0 ? "bg-amber-900/20 border-amber-500/50" : "bg-slate-800/80 border-slate-700"
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl filter drop-shadow-md">{RESOURCE_EMOJIS[resKey as keyof typeof RESOURCE_EMOJIS]}</span>
                      <div>
                        <div className="text-amber-50 font-bold">{RESOURCE_NAMES[resKey as keyof typeof RESOURCE_NAMES]}</div>
                        <div className="text-xs text-amber-200/50 mt-0.5">보유: <span className="font-cinzel font-bold">{myAmount}</span>개</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-950/80 rounded-lg p-1 border border-slate-700 shadow-inner">
                      <button 
                        onClick={() => handleSub(resKey)}
                        disabled={selAmount === 0}
                        className="w-8 h-8 rounded bg-slate-700 hover:bg-red-900/80 disabled:opacity-30 text-white font-bold transition-colors border border-slate-600"
                      >-</button>
                      <span className="w-4 text-center font-cinzel font-bold text-amber-400 text-lg">{selAmount}</span>
                      <button 
                        onClick={() => handleAdd(resKey)}
                        disabled={totalSelected >= requiredAmount || selAmount >= myAmount}
                        className="w-8 h-8 rounded bg-slate-700 hover:bg-emerald-900/80 disabled:opacity-30 text-white font-bold transition-colors border border-slate-600"
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={totalSelected !== requiredAmount}
              className={clsx(
                "w-full py-4 font-bold rounded-xl transition-all text-lg shadow-md border",
                totalSelected === requiredAmount 
                  ? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-amber-400 shadow-glow-gold transform hover:scale-[1.02]" 
                  : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
              )}
            >
              {totalSelected === requiredAmount ? '지불하고 스킬 사용하기' : '지불할 자원이 부족합니다'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}