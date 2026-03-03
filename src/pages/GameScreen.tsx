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

type PanelView = 'map' | 'tech' | 'city' | 'units';

export function GameScreen() {
  const navigate = useNavigate();
  const { players, turn, isGameOver, winner, currentPlayerIndex, combatState, setupState } = useGameStore();
  const [activeView, setActiveView] = useState<PanelView>('map');
  const [showPlayerTransition, setShowPlayerTransition] = useState(false);
  const [previousPlayerIndex, setPreviousPlayerIndex] = useState(currentPlayerIndex);

  // 플레이어 변경 시 전환 화면 표시
  useEffect(() => {
    if (previousPlayerIndex !== currentPlayerIndex && players.length > 1) {
      setShowPlayerTransition(true);
      setPreviousPlayerIndex(currentPlayerIndex);
    }
  }, [currentPlayerIndex, previousPlayerIndex, players.length]);

  if (players.length === 0) {
    navigate('/');
    return null;
  }

  const currentPlayer = players[currentPlayerIndex];

  // 국가 선택 화면
  if (setupState.phase === 'nationSelect') {
    return <NationSelectionScreen />;
  }

  // 수도 위치 선택 화면
  if (setupState.phase === 'capitalSelect') {
    return <CapitalSelectionScreen />;
  }

  // 플레이어 전환 화면
  if (showPlayerTransition) {
    return (
      <PlayerTransition
        playerName={currentPlayer.name}
        playerColor={currentPlayer.color}
        onReady={() => setShowPlayerTransition(false)}
      />
    );
  }

  // 전투 화면
  if (combatState.isActive) {
    return <CombatPanel />;
  }

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* 상단 바 */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white"
          >
            ← 메뉴
          </button>
          <div className="text-amber-500 font-semibold">턴 {turn}</div>
        </div>

        <PhaseIndicator />

        <div className="flex items-center gap-4">
          <div className="text-slate-400">
            현재: <span className="text-white font-semibold">{currentPlayer.name}</span>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 패널 - 플레이어 정보 */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <PlayerPanel />
        </aside>

        {/* 중앙 - 맵/기술/도시 뷰 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 전환 탭 */}
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex gap-2">
            <button
              onClick={() => setActiveView('map')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'map'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              맵
            </button>
            <button
              onClick={() => setActiveView('tech')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'tech'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              기술 트리
            </button>
            <button
              onClick={() => setActiveView('city')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'city'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              도시 관리
            </button>
            <button
              onClick={() => setActiveView('units')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === 'units'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              유닛 관리
            </button>
          </div>

          {/* 뷰 컨텐츠 */}
          <div className="flex-1 overflow-auto p-4">
            {activeView === 'map' && <MapGrid />}
            {activeView === 'tech' && <TechTree />}
            {activeView === 'city' && <CityPanel />}
            {activeView === 'units' && <UnitPanel />}
          </div>
        </main>
            
        {/* 오른쪽 패널 - 액션 */}
        <aside className="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto z-10">
          <ActionPanel />
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex items-end gap-4 pointer-events-none">
        
        {/* pointer-events-auto를 줘서 버튼 클릭이 가능하게 합니다 */}
        <div className="pointer-events-auto">
          {/* 부대 카드 위젯 */}
          <ArmyCardsWidget />
        </div>

        <div className="pointer-events-auto">
          {/* 새로 추가한 문화 이벤트 카드 인벤토리 */}
          <CultureCardInventory />
        </div>
        
        <div className="pointer-events-auto">
          <TechAbilityWidget />
        </div>
        {/* 공공 서비스 방해 모달 */}
        <InterruptModal />     
      </div>

      {/* 승리 모달 */}
      {isGameOver && winner && <VictoryModal />}
      
      {/*자원 선택 모달 */}
      <ResourceSelectionModal />

      {/* 연구 결과 모달 */}
      <ResearchResultsModal />
    </div>
  );
}