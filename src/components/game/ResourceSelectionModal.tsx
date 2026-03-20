import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { ResourceType } from '../../types/map';

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-800 border-2 border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h2 className="text-xl font-bold text-amber-400">자원 지불 선택</h2>
            <button onClick={cancelResourceSelection} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
          
          <p className="text-slate-300 text-sm mb-6 text-center bg-slate-700/50 p-3 rounded-lg">
            스킬을 사용하기 위해 임의의 자원 <strong className="text-white text-lg">{requiredAmount}</strong>개를 버려야 합니다.
            <br/><span className="text-amber-300 font-bold">(현재 {totalSelected} / {requiredAmount}개 선택)</span>
          </p>

          <div className="space-y-3 mb-6">
            {Object.keys(selected).map((resKey) => {
              const myAmount = player.luxuryResources[resKey as Exclude<ResourceType, 'none'>];
              const selAmount = selected[resKey];
              
              return (
                <div key={resKey} className="flex items-center justify-between bg-slate-700 p-3 rounded-xl border border-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{RESOURCE_EMOJIS[resKey as keyof typeof RESOURCE_EMOJIS]}</span>
                    <div>
                      <div className="text-white font-bold">{RESOURCE_NAMES[resKey as keyof typeof RESOURCE_NAMES]}</div>
                      <div className="text-xs text-slate-400">보유: {myAmount}개</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
                    <button 
                      onClick={() => handleSub(resKey)}
                      disabled={selAmount === 0}
                      className="w-8 h-8 rounded bg-slate-600 hover:bg-red-500/80 disabled:opacity-30 text-white font-bold transition-colors"
                    >-</button>
                    <span className="w-4 text-center text-white font-bold">{selAmount}</span>
                    <button 
                      onClick={() => handleAdd(resKey)}
                      disabled={totalSelected >= requiredAmount || selAmount >= myAmount}
                      className="w-8 h-8 rounded bg-slate-600 hover:bg-emerald-500/80 disabled:opacity-30 text-white font-bold transition-colors"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={totalSelected !== requiredAmount}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
          >
            {totalSelected === requiredAmount ? '지불하고 스킬 사용하기' : '자원이 부족합니다'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}