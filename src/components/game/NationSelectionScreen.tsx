// src/components/game/NationSelectionScreen.tsx

import { useGameStore } from '../../store/gameStore';
import { NATIONS } from '../../types/nation';
import { NationType } from '../../types';

// UI 표시용 기술/정치체제 이름 매핑 헬퍼
const displayNames: Record<string, string> = {
  currency: '통화',
  code_of_laws: '법계',
  construction: '건설',
  pottery: '도기 제조',
  communism_tech: '공산주의',
  iron_working: '금속 가공',
  despotism: '전제군주제',
  communism: '공산주의',
};

export function NationSelectionScreen() {
  const { setupState, players, selectNation } = useGameStore();

  const currentPlayerIndex = setupState.currentSetupPlayer;
  const currentPlayer = players[currentPlayerIndex];
  const selectedNations = setupState.selectedNations as NationType[];

  // 랜덤 선택 함수
  const handleRandomPick = () => {
    const availableNations = (Object.keys(NATIONS) as NationType[]).filter(
      (n) => !selectedNations.includes(n)
    );
    if (availableNations.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableNations.length);
      selectNation(currentPlayerIndex, availableNations[randomIndex]);
    }
  };

  if (!currentPlayer) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
      
      {/* 턴 헤더 */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-amber-500 mb-2">
          {currentPlayer.name} 님의 국가 선택
        </h1>
        <p className="text-slate-400">당신의 제국을 이끌 위대한 국가를 선택하세요.</p>
      </div>

      {/* 국가 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {Object.entries(NATIONS).map(([nationId, nationDef]) => {
          const isSelected = selectedNations.includes(nationId as NationType);
          const bonus = nationDef.startingBonus;

          return (
            <div
              key={nationId}
              onClick={() => !isSelected && selectNation(currentPlayerIndex, nationId as NationType)}
              className={`relative group bg-slate-800 p-6 rounded-xl border-2 transition-all duration-200 
                ${isSelected 
                  ? 'border-slate-700 opacity-40 cursor-not-allowed grayscale' 
                  : 'border-slate-600 hover:border-amber-500 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                }`}
            >
              <div className="text-center">
                <div className="text-6xl mb-3 drop-shadow-md">{nationDef.flag}</div>
                <h2 className="text-2xl font-bold" style={{ color: isSelected ? '#9ca3af' : nationDef.color }}>
                  {nationDef.name}
                </h2>
                {isSelected && <span className="text-red-500 font-bold text-sm mt-2 block">선택 완료됨</span>}
              </div>

              {/* 🌟 마우스 오버(Hover) 시 나타나는 상세 설명 툴팁 (새로운 타입 아키텍처 반영) */}
              {!isSelected && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-80 p-5 bg-slate-950 border border-amber-600 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-left">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-amber-600"></div>
                  
                  <h3 className="text-lg font-bold text-amber-400 mb-1">[{nationDef.name}]</h3>
                  <p className="text-xs text-slate-400 mb-4 italic leading-relaxed">"{nationDef.description}"</p>
                  
                  <div className="space-y-3">
                    {/* 고유 능력 */}
                    <div>
                      <span className="text-sm font-bold text-blue-400 flex items-center gap-1">✨ 특수 능력</span>
                      <span className="text-xs text-slate-300 mt-1 block leading-tight">
                        {nationDef.specialAbility.description}
                      </span>
                    </div>
                    
                    {/* 시작 보너스 */}
                    <div>
                      <span className="text-sm font-bold text-green-400 flex items-center gap-1">🎁 시작 보너스</span>
                      <ul className="text-xs text-slate-300 list-disc pl-5 mt-1 space-y-1">
                        {bonus.unlockedTechs && bonus.unlockedTechs.length > 0 && (
                          <li>시작 기술: {bonus.unlockedTechs.map(t => displayNames[t] || t).join(', ')}</li>
                        )}
                        {bonus.startingGovernment && (
                          <li>정치체제: {displayNames[bonus.startingGovernment] || bonus.startingGovernment}</li>
                        )}
                        {bonus.greatPeople && (
                          <li>무료 위인 <span className="text-amber-300 font-bold">{bonus.greatPeople}명</span> 제공</li>
                        )}
                        {bonus.armyCards && (
                          <li>시작 부대 카드 <span className="text-amber-300 font-bold">{bonus.armyCards.reduce((acc, card) => acc + card.count, 0)}장</span> 제공</li>
                        )}
                        {bonus.extraMilitaryUnits && (
                          <li>군사 유닛 추가 <span className="text-amber-300 font-bold">{bonus.extraMilitaryUnits}기</span> (유닛 상한: {bonus.militaryLimit || 6})</li>
                        )}
                        {bonus.stackingLimitBonus && (
                          <li>타일 유닛 배치(스택) 상한 <span className="text-amber-300 font-bold">+{bonus.stackingLimitBonus}</span></li>
                        )}
                        {bonus.hasWalls && (
                          <li>수도에 <span className="text-amber-300 font-bold">성벽</span> 기본 건설됨</li>
                        )}
                        {bonus.wonderCards && (
                          <li>불가사의 카드 <span className="text-amber-300 font-bold">{bonus.wonderCards}장</span> 제공</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 랜덤 버튼 */}
      <div className="mt-12">
        <button
          onClick={handleRandomPick}
          className="px-8 py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg shadow-lg transition-transform hover:scale-105 border border-purple-500 flex items-center gap-2"
        >
          <span className="text-xl">🎲</span> 운명에 맡기기 (랜덤 선택)
        </button>
      </div>

    </div>
  );
}