// src/components/game/ActionPanel.tsx

import { useState } from 'react'; 
import { useGameStore } from '../../store/gameStore';
import { getPhaseDisplayName, getPhaseDescription, calculateTradeIncome } from '../../engine/GameEngine';
import { TERRAIN_PROPERTIES } from '../../types';
import { GovernmentPanel } from './GovernmentPanel';
import { PioneerActionModal } from './PioneerActionModal'; 
import clsx from 'clsx';

export function ActionPanel() {
  const {
    currentPhase,
    currentPlayerIndex,
    players,
    selectedTile,
    selectedUnit,
    map,
    endPhaseForCurrentPlayer,
    collectTradeIncome,
    addTrade,
    addCulture,
    addCurrency,
    setSelectedUnit,
    firstPlayerIndex,
    getPlayerOrderForCurrentRound,
    debugSkipPhase,
    startTargeting, 
    targetingMode,
    addToast
  } = useGameStore();

  const [isPioneerModalOpen, setIsPioneerModalOpen] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  const unplacedGPCount = currentPlayer.unplacedGreatPeople?.length || 0;
  const selectedTileData = selectedTile
    ? map.tiles[selectedTile.y]?.[selectedTile.x]
    : null;

  const selectedUnitData = selectedUnit
    ? currentPlayer.units.find((u) => u.id === selectedUnit)
    : null;

  const tradeIncome = calculateTradeIncome(currentPlayer, map);

  const handleCollectTrade = () => {
    collectTradeIncome(currentPlayer.id);
  };

  const isOutskirts = (pos: { x: number; y: number }) => {
    return !players.some(p =>
      p.cities.some(c =>
        Math.abs(c.position.x - pos.x) <= 1 && Math.abs(c.position.y - pos.y) <= 1
      )
    );
  };
  
  const hasOutskirtsSettler = currentPlayer.units.some(
    (u) => u.type === 'settler' && isOutskirts(u.position)
  );

  return (
    <div className="p-4 space-y-4">
      {/* 🌟 현재 단계 정보 (프리미엄 질감) */}
      <div className="panel-texture rounded-lg p-5">
        <div className="panel-content text-center">
          <h3 className="text-2xl font-serif font-black text-amber-400 text-glow-gold mb-1">
            {getPhaseDisplayName(currentPhase)}
          </h3>
          <p className="text-xs font-serif text-amber-200/60 mt-2 break-keep">
            {getPhaseDescription(currentPhase)}
          </p>
        </div>
      </div>

      {/* 🌟 선택된 타일 정보 */}
      {selectedTileData && (
        <div className="bg-slate-900/60 border border-amber-700/30 shadow-inner rounded-lg p-4">
          <h4 className="text-amber-500 font-serif font-bold mb-2 border-b border-amber-900/50 pb-1">선택된 타일 정보</h4>
          <div className="text-xs text-slate-300 space-y-1.5 font-serif">
            <p className="flex justify-between">
              <span>위치</span> 
              <span className="font-cinzel text-amber-200 font-bold">({selectedTileData.position.x}, {selectedTileData.position.y})</span>
            </p>
            <p className="flex justify-between">
              <span>지형</span> 
              <span className="text-slate-100">{TERRAIN_PROPERTIES[selectedTileData.terrain].name}</span>
            </p>
            {selectedTileData.cityId && (
              <p className="text-amber-400 text-right mt-1 bg-amber-900/20 px-2 py-1 rounded">🏛️ 도시가 건설됨</p>
            )}
            {selectedTileData.unitIds.length > 0 && (
              <p className="text-blue-400 text-right mt-1 bg-blue-900/20 px-2 py-1 rounded">👥 주둔 유닛: <span className="font-cinzel">{selectedTileData.unitIds.length}</span></p>
            )}
          </div>
        </div>
      )}

      {/* 🌟 선택된 유닛 정보 */}
      {selectedUnitData && (
        <div className="bg-slate-900/60 border border-indigo-700/30 shadow-inner rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 border-b border-indigo-900/50 pb-1">
            <h4 className="text-indigo-400 font-serif font-bold">선택된 부대</h4>
            <button onClick={() => setSelectedUnit(null)} className="text-slate-500 hover:text-white text-xs px-2 rounded border border-slate-700 bg-slate-800">닫기 ✕</button>
          </div>
          <div className="text-xs text-slate-300 space-y-1.5 font-serif">
            <p className="flex justify-between">
              <span>타입</span>
              <span className="text-indigo-200">{selectedUnitData.type === 'military' ? '⚔️ 정규군' : '👷 개척자'}</span>
            </p>
            <p className="flex justify-between">
              <span>기동력</span>
              <span className="font-cinzel font-bold text-indigo-300">{selectedUnitData.movement} <span className="text-[10px] text-slate-500">/ {selectedUnitData.maxMovement}</span></span>
            </p>
            {selectedUnitData.hasMoved && (
              <p className="text-yellow-500 text-right mt-1 bg-yellow-900/20 px-2 py-1 rounded font-bold">⚠️ 행동 완료</p>
            )}
          </div>
        </div>
      )}

      {/* 정치체제 패널 */}
      <GovernmentPanel />

      {/* 단계별 액션 컨테이너 */}
      <div className="space-y-3 pt-2">
        {currentPhase === 'start' && (
          <div className="space-y-3">
            {/* 개척자 보급 스킬 버튼 */}
            <div className="bg-slate-900/80 border border-amber-700/40 p-3 rounded-lg shadow-inner">
              <p className="text-amber-100 text-sm font-serif font-bold mb-2 flex items-center gap-1.5">
                <span className="text-lg">⛺</span> 개척자 보급 스킬
              </p>
              <button
                onClick={() => setIsPioneerModalOpen(true)}
                disabled={!hasOutskirtsSettler}
                className={`w-full py-2.5 rounded font-serif font-bold transition-all shadow-md ${
                  hasOutskirtsSettler
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] transform hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {hasOutskirtsSettler ? '보급 스킬 사용하기' : '조건 미달 (외곽지 개척자 없음)'}
              </button>
            </div>

            {/* 대기 중인 위인 배치 버튼 */}
            {unplacedGPCount > 0 && (
              <div className="bg-amber-950/80 border border-amber-500/60 p-3 rounded-lg shadow-inner">
                <p className="text-amber-300 text-xs font-serif font-bold mb-2">
                  🌟 대기 중인 위인이 있습니다! (<span className="font-cinzel text-sm">{unplacedGPCount}</span>명)
                </p>
                <button
                  onClick={() => {
                    startTargeting('place_great_person', 'tile');
                    addToast("지도에서 위인을 배치할 타일을 클릭하세요. (도심부, 물, 불가사의 제외)");
                  }}
                  className={`w-full py-2.5 rounded font-serif font-bold transition-all shadow-md ${
                    targetingMode?.techId === 'place_great_person' 
                      ? 'bg-amber-400 text-amber-900 animate-pulse border border-amber-300' 
                      : 'bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white border border-amber-500/50 shadow-glow-gold transform hover:scale-[1.02]'
                  }`}
                >
                  {targetingMode?.techId === 'place_great_person' ? '맵에서 타일 선택 중...' : '위인 맵에 배치하기'}
                </button>
              </div>
            )}
            
            <p className="text-[11px] text-slate-400 font-serif leading-relaxed px-1">
              정치체제를 변경하거나 개척자로 도시를 건설할 수 있습니다. 유닛 관리 탭을 확인하세요.
            </p>
          </div>
        )}

        {currentPhase === 'trade' && (
          <div className="space-y-3">
            {currentPlayer.hasCollectedTrade ? (
              <div className="bg-green-950/60 border border-green-700/50 rounded-lg p-4 text-center shadow-inner">
                <p className="text-green-400 font-serif font-bold text-sm">✓ 교역 수입 수령 완료</p>
                <p className="text-slate-400 text-[10px] mt-2 font-serif">턴 종료 버튼을 눌러 다음으로 진행하세요.</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-center shadow-inner flex flex-col items-center justify-center">
                  <p className="text-slate-400 text-xs font-serif mb-1">이번 턴 예상 교역 수입</p>
                  <p className="text-amber-400 font-cinzel font-bold text-3xl text-glow-gold">+{tradeIncome}</p>
                </div>
                <button
                  onClick={handleCollectTrade}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-400 text-amber-50 rounded-lg text-sm font-serif font-bold transition-all shadow-glow-gold transform hover:scale-[1.02]"
                >
                  📦 교역 수입 수령
                </button>
              </>
            )}
          </div>
        )}

        {currentPhase === 'cityManagement' && (
           <p className="text-xs text-amber-200/60 font-serif px-1 leading-relaxed">
             중앙의 '도시 관리' 탭에서 건물을 건설하고 유닛을 징집하십시오.
           </p>
        )}

        {currentPhase === 'movement' && (
          <div className="space-y-2 px-1">
            <p className="text-xs text-amber-200/60 font-serif leading-relaxed">
              중앙의 '유닛 관리' 탭에서 부대를 이동하거나 교전을 선언하십시오.
            </p>
            {currentPlayer.units.some(u => u.movement > 0) ? (
              <p className="text-[11px] text-green-400 font-bold mt-2">▶ 이동 가능한 유닛이 남아있습니다.</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-2">모든 부대가 행동을 완료했습니다.</p>
            )}
          </div>
        )}

        {currentPhase === 'research' && (
           <p className="text-xs text-amber-200/60 font-serif px-1 leading-relaxed">
             '기술 트리' 탭에서 교역 토큰을 소모하여 새로운 기술을 연구하십시오.
           </p>
        )}
      </div>

      {/* 플레이어 순서 표시 */}
      <div className="pt-5 border-t border-amber-700/30">
        <h4 className="text-xs font-serif font-bold text-amber-500/80 mb-2">현재 라운드 순서</h4>
        <div className="flex gap-1.5 flex-wrap">
          {getPlayerOrderForCurrentRound().map((idx, order) => {
            const player = players[idx];
            const isCurrent = idx === currentPlayerIndex;
            return (
              <span
                key={idx}
                className={`text-[11px] font-serif px-2 py-1 rounded shadow-sm border ${
                  isCurrent
                    ? 'bg-amber-800/80 text-amber-100 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span className="font-cinzel mr-1">{order + 1}.</span>{player.name}
                {idx === firstPlayerIndex && <span className="text-amber-400 ml-1">★</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* 🌟 다음 단계 / 턴 종료 버튼 (메인 액션) */}
      <div className="pt-5 border-t border-amber-700/30 space-y-3">
        <button
          onClick={endPhaseForCurrentPlayer}
          className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border-2 border-slate-500 text-white rounded-lg text-base font-serif font-black transition-all shadow-lg transform hover:scale-[1.02] tracking-widest text-shadow-sm"
        >
          {currentPhase === 'research' ? '연구 종료 (턴 넘기기) ➔' : '차례 종료 (다음 단계) ➔'}
        </button>
        
        <button
          onClick={debugSkipPhase}
          className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400/80 rounded text-[10px] font-sans transition-colors border border-red-900/30"
        >
          [DEV] 페이즈 강제 스킵
        </button>
      </div>

      {/* 🌟 승리 진행도 (클래식 보드게임 스탯 보드 테마) */}
      <div className="pt-5 border-t border-amber-700/30">
        <h4 className="text-sm font-serif font-bold text-amber-500 mb-3 text-glow-gold">승리 조건 달성도</h4>
        <div className="space-y-2 bg-slate-900/60 p-3 rounded border border-amber-900/30 shadow-inner">
          <div className="flex justify-between items-center text-xs font-serif text-slate-300">
            <span><span className="text-base mr-1">🔬</span> 과학 (5레벨 기술)</span>
            <span className={clsx("font-cinzel font-bold text-sm", currentPlayer.technologies.some(t => t.id === 'space_flight') ? 'text-green-400' : 'text-amber-200/80')}>
                {currentPlayer.technologies.some(t => t.id === 'space_flight') ? '달성!' : `${currentPlayer.technologies.filter(t => t.level === 5).length}/1`}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs font-serif text-slate-300">
            <span><span className="text-base mr-1">🎭</span> 문화 (트랙 도달)</span>
            <span className="font-cinzel font-bold text-sm text-amber-200/80">{currentPlayer.cultureTrack}/20</span>
          </div>
          <div className="flex justify-between items-center text-xs font-serif text-slate-300">
            <span><span className="text-base mr-1">💰</span> 경제 (화폐 축적)</span>
            <span className="font-cinzel font-bold text-sm text-amber-200/80">{currentPlayer.resources.currency}/15</span>
          </div>
          <div className="flex justify-between items-center text-xs font-serif text-slate-300">
            <span><span className="text-base mr-1">⚔️</span> 군사 (수도 방어)</span>
            <span className={clsx("font-bold", currentPlayer.hasCapital ? "text-green-400" : "text-red-500")}>
                {currentPlayer.hasCapital ? '안전함' : '함락됨!'}
            </span>
          </div>
        </div>
      </div>

      {/* 디버그 액션 */}
      <div className="pt-4 border-t border-slate-700/50">
        <details className="text-xs">
          <summary className="text-slate-500 cursor-pointer mb-2">개발자 전용 자원 치트</summary>
          <div className="flex gap-2">
            <button onClick={() => addCulture(currentPlayer.id, 5)} className="flex-1 py-1.5 bg-purple-900/50 hover:bg-purple-800 border border-purple-700/50 text-purple-200 rounded">문화+5</button>
            <button onClick={() => addCurrency(currentPlayer.id, 3)} className="flex-1 py-1.5 bg-yellow-900/50 hover:bg-yellow-800 border border-yellow-700/50 text-yellow-200 rounded">화폐+3</button>
            <button onClick={() => addTrade(currentPlayer.id, 5)} className="flex-1 py-1.5 bg-amber-900/50 hover:bg-amber-800 border border-amber-700/50 text-amber-200 rounded">교역+5</button>
          </div>
        </details>
      </div>

      <PioneerActionModal 
        isOpen={isPioneerModalOpen} 
        onClose={() => setIsPioneerModalOpen(false)} 
      />
    </div>
  );
}