// src/pages/GameScreen.tsx

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { MapGrid } from '../components/game/Map/MapGrid';
import { PlayerPanel } from '../components/game/PlayerPanel';
import { PhaseIndicator } from '../components/game/PhaseIndicator';
import { ActionPanel } from '../components/game/ActionPanel';
import { VictoryModal } from '../components/game/VictoryModal';
import { TechTree } from '../components/game/Tech/TechTree';
import { CityPanel } from '../components/game/City/CityPanel';
import { UnitPanel } from '../components/game/Units/UnitPanel';
import { CombatPanel } from '../components/game/Combat/CombatPanel';
import { PlayerTransition } from '../components/game/PlayerTransition';
import { NationSelectionScreen } from '../components/game/NationSelectionScreen';
import { CapitalSelectionScreen } from '../components/game/CapitalSelectionScreen';
import { ArmyCardsWidget } from '../components/game/ArmyCardsWidget';
import { useState, useEffect } from 'react';
import { CultureCardInventory } from '../components/game/CultureCardInventory';
import { TechAbilityWidget } from '../components/game/TechAbilityWidget';
import { ResearchResultsModal } from '../components/game/ResearchResultsModal';
import { ResourceSelectionModal } from '../components/game/ResourceSelectionModal';
import { InterruptModal } from '../components/game/InterruptModal';
import { WonderActionModal } from '../components/game/WonderActionModal';
import { CultureTrackWidget } from '../components/game/CultureTrackWidget';
import { CultureCardTargetModal } from '../components/game/CultureCardTargetModal';
import { NationModals } from '../components/game/NationModals';
import { ToastNotification } from '../components/game/ToastNotification';

type PanelView = 'map' | 'tech' | 'city' | 'units';

export function GameScreen() {
  const navigate = useNavigate();
  // 🌟 [수정] currentPhase 추가
  const { players, turn, currentPhase, isGameOver, winner, currentPlayerIndex, combatState, setupState, marketResources } = useGameStore();
  const [activeView, setActiveView] = useState<PanelView>('map');
  const [showPlayerTransition, setShowPlayerTransition] = useState(false);
  const [previousPlayerIndex, setPreviousPlayerIndex] = useState(currentPlayerIndex);

  useEffect(() => {
    if (players.length === 0) {
      navigate('/');
    }
  }, [players.length, navigate]);

  useEffect(() => {
    if (previousPlayerIndex !== currentPlayerIndex && players.length > 1) {
      setShowPlayerTransition(true);
      setPreviousPlayerIndex(currentPlayerIndex);
    }
  }, [currentPlayerIndex, previousPlayerIndex, players.length]);

  if (players.length === 0) return null;

  const currentPlayer = players[currentPlayerIndex];

  if (setupState.phase === 'nationSelect') return <NationSelectionScreen />;
  if (setupState.phase === 'capitalSelect') return <CapitalSelectionScreen />;

  if (showPlayerTransition) {
    return (
      <PlayerTransition
        playerName={currentPlayer.name}
        playerColor={currentPlayer.color}
        onReady={() => setShowPlayerTransition(false)}
      />
    );
  }

  if (combatState.isActive) return <CombatPanel />;

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      
      <ToastNotification />
      
      {/* 🌟 [수정] 테마가 적용된 상단 헤더 바 */}
      <header className="panel-texture px-5 py-2 flex flex-wrap items-center justify-between shadow-md z-20">
        <div className="panel-content w-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-amber-400 transition-colors font-serif text-sm border border-transparent hover:border-amber-700/50 px-2 py-1 rounded"
            >
              ← 메뉴
            </button>
            <h1 className="text-2xl md:text-3xl font-cinzel font-black text-amber-500 text-glow-gold tracking-widest drop-shadow-lg leading-none mt-1">
              CIVILIZATION
            </h1>
            <div className="hidden sm:flex items-center text-sm font-serif text-amber-200/80 gap-3 border-l border-amber-700/30 pl-6">
              <span>
                턴 <span className="font-cinzel font-bold text-amber-400 text-lg mx-1">{turn}</span>
              </span>
              <span className="px-3 py-1 bg-slate-900/80 border border-amber-700/50 rounded-md text-amber-300 shadow-inner">
                {currentPhase === 'start' ? '시작 단계' : 
                 currentPhase === 'trade' ? '교역 단계' : 
                 currentPhase === 'cityManagement' ? '도시 경영 단계' : 
                 currentPhase === 'movement' ? '이동 단계' : '기술 연구 단계'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center flex-1 mx-4 max-w-sm hidden lg:block">
             <PhaseIndicator />
          </div>

          <div className="flex items-center gap-4 text-sm font-serif text-slate-300">
            <div className="bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700">
              현재 턴: <span className="text-white font-bold text-base ml-1">{currentPlayer.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 🌟 [수정] 테마가 적용된 공용 시장 재고 바 */}
      <div className="panel-texture border-t-0 border-b border-amber-700/30 px-4 py-1.5 flex justify-center items-center gap-6 shadow-md z-10 text-sm">
        <div className="panel-content flex items-center gap-6">
            <div className="font-bold text-amber-200/80 font-serif flex items-center gap-2">
            <span className="text-lg">⚖️</span> 공용 시장 재고
            </div>
            <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-md border border-amber-700/40 shadow-inner">
                <span title="향료" className="text-lg">🏺</span>
                <span className="font-cinzel font-bold text-amber-400 text-glow-gold text-lg">{marketResources?.spice ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-md border border-amber-700/40 shadow-inner">
                <span title="밀" className="text-lg">🌾</span>
                <span className="font-cinzel font-bold text-amber-400 text-glow-gold text-lg">{marketResources?.wheat ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-md border border-amber-700/40 shadow-inner">
                <span title="비단" className="text-lg">🧣</span>
                <span className="font-cinzel font-bold text-amber-400 text-glow-gold text-lg">{marketResources?.silk ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-md border border-amber-700/40 shadow-inner">
                <span title="철" className="text-lg">⛏️</span>
                <span className="font-cinzel font-bold text-amber-400 text-glow-gold text-lg">{marketResources?.iron ?? 0}</span>
            </div>
            </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 패널 - 플레이어 정보 */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <PlayerPanel />
        </aside>

        {/* 중앙 - 맵/기술/도시 뷰 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 전환 탭 */}
          <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 flex gap-2 shadow-sm z-10">
            <button
              onClick={() => setActiveView('map')}
              className={`px-5 py-2 rounded-t-lg transition-colors font-serif font-semibold border-b-2 ${
                activeView === 'map'
                  ? 'bg-slate-800 text-amber-400 border-amber-500'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              🗺️ 맵
            </button>
            <button
              onClick={() => setActiveView('tech')}
              className={`px-5 py-2 rounded-t-lg transition-colors font-serif font-semibold border-b-2 ${
                activeView === 'tech'
                  ? 'bg-slate-800 text-amber-400 border-amber-500'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              ⚙️ 기술 트리
            </button>
            <button
              onClick={() => setActiveView('city')}
              className={`px-5 py-2 rounded-t-lg transition-colors font-serif font-semibold border-b-2 ${
                activeView === 'city'
                  ? 'bg-slate-800 text-amber-400 border-amber-500'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              🏛️ 도시 관리
            </button>
            <button
              onClick={() => setActiveView('units')}
              className={`px-5 py-2 rounded-t-lg transition-colors font-serif font-semibold border-b-2 ${
                activeView === 'units'
                  ? 'bg-slate-800 text-amber-400 border-amber-500'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              ⚔️ 유닛 관리
            </button>
          </div>

          {/* 뷰 컨텐츠 */}
          <div className="flex-1 overflow-auto p-4 relative bg-slate-900">
            {activeView === 'map' && <MapGrid />}
            {activeView === 'tech' && <TechTree />}
            {activeView === 'city' && <CityPanel />}
            {activeView === 'units' && <UnitPanel />}
          </div>
        </main>
            
        {/* 오른쪽 패널 - 액션 */}
        <aside className="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.5)]">
          <ActionPanel />
        </aside>
      </div>

      {/* 오버레이 위젯들 */}
      <div className="fixed bottom-6 right-6 z-40 flex items-end gap-4 pointer-events-none">
        <div className="pointer-events-auto shadow-xl"><CultureTrackWidget /></div>
        <div className="pointer-events-auto shadow-xl"><ArmyCardsWidget /></div>
        <div className="pointer-events-auto shadow-xl"><CultureCardInventory /></div>
        <div className="pointer-events-auto shadow-xl"><TechAbilityWidget /></div>     
      </div>

      {/* 모달들 */}
      <InterruptModal />
      {isGameOver && winner && <VictoryModal />}
      <ResourceSelectionModal />
      <ResearchResultsModal />
      <WonderActionModal />
      <CultureCardTargetModal />
      <NationModals />
    </div>
  );
}