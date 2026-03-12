// src/components/game/ActionPanel.tsx

import { useState } from 'react'; // 🌟 useState 임포트 추가
import { useGameStore } from '../../store/gameStore';
import { getPhaseDisplayName, getPhaseDescription, calculateTradeIncome } from '../../engine/GameEngine';
import { TERRAIN_PROPERTIES } from '../../types';
import { GovernmentPanel } from './GovernmentPanel';
import { PioneerActionModal } from './PioneerActionModal'; // 🌟 모달 컴포넌트 임포트

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
  } = useGameStore();

  // 🌟 모달 팝업 상태 관리
  const [isPioneerModalOpen, setIsPioneerModalOpen] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  const unplacedGPCount = currentPlayer.unplacedGreatPeople?.length || 0;
  const selectedTileData = selectedTile
    ? map.tiles[selectedTile.y]?.[selectedTile.x]
    : null;

  const selectedUnitData = selectedUnit
    ? currentPlayer.units.find((u) => u.id === selectedUnit)
    : null;

  // 계산된 수입
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
  
  // 🌟 교외(cityId가 없는 타일)에 위치한 개척자 존재 여부 판별
  const hasOutskirtsSettler = currentPlayer.units.some(
    (u) => u.type === 'settler' && isOutskirts(u.position)
  );

  return (
    <div className="p-4 space-y-4">
      {/* 현재 단계 정보 */}
      <div className="bg-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-500">
          {getPhaseDisplayName(currentPhase)}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {getPhaseDescription(currentPhase)}
        </p>
      </div>

      {/* 선택된 타일 정보 */}
      {selectedTileData && (
        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">선택된 타일</h4>
          <div className="text-sm text-slate-300 space-y-1">
            <p>위치: ({selectedTileData.position.x}, {selectedTileData.position.y})</p>
            <p>지형: {TERRAIN_PROPERTIES[selectedTileData.terrain].name}</p>
            {selectedTileData.cityId && (
              <p className="text-amber-400">🏛️ 도시가 있음</p>
            )}
            {selectedTileData.unitIds.length > 0 && (
              <p className="text-blue-400">👥 유닛: {selectedTileData.unitIds.length}개</p>
            )}
          </div>
        </div>
      )}

      {/* 선택된 유닛 정보 */}
      {selectedUnitData && (
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">선택된 유닛</h4>
            <button
              onClick={() => setSelectedUnit(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p>{selectedUnitData.type === 'military' ? '⚔️ 군사 유닛' : '👷 개척자'}</p>
            <p>이동력: {selectedUnitData.movement}/{selectedUnitData.maxMovement}</p>
            {selectedUnitData.hasMoved && (
              <p className="text-yellow-400">이미 이동함</p>
            )}
          </div>
        </div>
      )}

      {/* 정치체제 패널 */}
      <GovernmentPanel />

      {/* 단계별 액션 */}
      <div className="space-y-2">
        {currentPhase === 'start' && (
          <div className="space-y-2">
            
            {/* 🌟 [신규 추가] 개척자 보급 스킬 버튼 (시작 단계에서만 활성화) */}
            <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg mb-2">
              <p className="text-white text-sm font-bold mb-2 flex items-center gap-1">
                <span>⛺</span> 개척자 보급 스킬
              </p>
              <button
                onClick={() => setIsPioneerModalOpen(true)}
                disabled={!hasOutskirtsSettler}
                className={`w-full py-2 rounded font-bold transition-colors ${
                  hasOutskirtsSettler
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                }`}
              >
                {hasOutskirtsSettler ? '보급 스킬 사용하기' : '조건 미달 (교외 개척자 없음)'}
              </button>
            </div>

            {/* 대기 중인 위인이 있을 때만 보이는 버튼 UI */}
            {unplacedGPCount > 0 && (
              <div className="bg-amber-900/50 border border-amber-500 p-3 rounded-lg mb-2">
                <p className="text-amber-300 text-sm font-bold mb-2">
                  🌟 대기 중인 위인이 있습니다! ({unplacedGPCount}명)
                </p>
                <button
                  onClick={() => {
                    startTargeting('place_great_person', 'tile');
                    alert("지도에서 위인을 배치할 타일을 클릭하세요. (도심부, 물, 불가사의 제외)");
                  }}
                  className={`w-full py-2 rounded font-bold transition-colors ${
                    targetingMode?.techId === 'place_great_person' 
                      ? 'bg-amber-500 text-black animate-pulse' 
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {targetingMode?.techId === 'place_great_person' ? '맵에서 타일 선택 중...' : '위인 맵에 배치하기'}
                </button>
              </div>
            )}
            
            <p className="text-sm text-slate-400">
              정치체제를 변경하거나 개척자로 도시를 건설할 수 있습니다.
            </p>
            <p className="text-xs text-slate-500">
              유닛 관리 탭에서 개척자를 선택하여 도시를 건설하세요.
            </p>
          </div>
        )}

        {currentPhase === 'trade' && (
          <div className="space-y-2">
            {currentPlayer.hasCollectedTrade ? (
              <div className="bg-green-900/50 border border-green-600 rounded-lg p-3 text-sm">
                <p className="text-green-400">✓ 교역 수입을 수령했습니다</p>
                <p className="text-slate-400 text-xs mt-1">단계 완료 버튼을 눌러 진행하세요.</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-600 rounded-lg p-3 text-sm">
                  <p className="text-slate-300 mb-1">예상 교역 수입:</p>
                  <p className="text-amber-400 font-semibold">+{tradeIncome} 교역 토큰</p>
                </div>
                <button
                  onClick={handleCollectTrade}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors"
                >
                  📦 교역 수입 수령
                </button>
              </>
            )}
          </div>
        )}

        {currentPhase === 'cityManagement' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              도시 관리 탭에서 건물을 건설하고 유닛을 생산하세요.
            </p>
            <div className="bg-slate-600 rounded-lg p-3 text-sm">
              <p className="text-slate-300">보유 도시: {currentPlayer.cities.length}/3</p>
              <p className="text-slate-300">군사 유닛: {currentPlayer.units.filter(u => u.type === 'military').length}/6</p>
              <p className="text-slate-300">개척자: {currentPlayer.units.filter(u => u.type === 'settler').length}/2</p>
            </div>
          </div>
        )}

        {currentPhase === 'movement' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              유닛 관리 탭에서 유닛을 선택하고 이동시키세요.
            </p>
            {currentPlayer.units.some(u => u.movement > 0) ? (
              <p className="text-xs text-green-400">
                이동 가능한 유닛이 있습니다.
              </p>
            ) : (
              <p className="text-xs text-yellow-400">
                모든 유닛이 이동을 완료했습니다.
              </p>
            )}
          </div>
        )}

        {currentPhase === 'research' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              기술 트리 탭에서 연구할 기술을 선택하세요.
            </p>
            <div className="bg-slate-600 rounded-lg p-3 text-sm">
              <p className="text-slate-300">교역 토큰: {currentPlayer.resources.trade}/27</p>
              <p className="text-slate-300">연구한 기술: {currentPlayer.technologies.length}개</p>
            </div>
          </div>
        )}
      </div>

      {/* 플레이어 순서 표시 */}
      <div className="pt-4 border-t border-slate-700">
        <h4 className="text-sm font-medium text-white mb-2">현재 라운드 순서</h4>
        <div className="flex gap-1 flex-wrap">
          {getPlayerOrderForCurrentRound().map((idx, order) => {
            const player = players[idx];
            const isCurrent = idx === currentPlayerIndex;
            return (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded ${
                  isCurrent
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {order + 1}. {player.name}
                {idx === firstPlayerIndex && ' ★'}
              </span>
            );
          })}
        </div>
      </div>

      {/* 다음 단계 / 턴 종료 */}
      <div className="pt-4 border-t border-slate-700 space-y-2">
        <button
          onClick={endPhaseForCurrentPlayer}
          className="w-full py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
        >
          {currentPhase === 'research'
            ? '연구 완료 →'
            : '다음 플레이어 / 단계 →'}
        </button>
        <button
          onClick={debugSkipPhase}
          className="w-full py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg text-xs transition-colors border border-red-700/30"
        >
          [DEV] 페이즈 건너뛰기 →{' '}
          {currentPhase === 'research' ? '차례시작' : {
            start: '교역',
            trade: '도시관리',
            cityManagement: '이동',
            movement: '연구',
          }[currentPhase]}
        </button>
      </div>

      {/* 게임 현황 */}
      <div className="pt-4 border-t border-slate-700">
        <h4 className="text-sm font-medium text-white mb-2">승리 진행도</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>🔬 과학</span>
            <span>{currentPlayer.technologies.some(t => t.id === 'space_flight') ? '완료!' : `${currentPlayer.technologies.filter(t => t.level === 5).length}/1`}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>🎭 문화</span>
            <span>{currentPlayer.cultureTrack}/20</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>💰 경제</span>
            <span>{currentPlayer.resources.currency}/15</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>⚔️ 군사</span>
            <span>{currentPlayer.hasCapital ? '수도 보유' : '수도 상실!'}</span>
          </div>
        </div>
      </div>

      {/* 디버그 액션 */}
      <div className="pt-4 border-t border-slate-700">
        <details className="text-xs">
          <summary className="text-slate-500 cursor-pointer mb-2">테스트 버튼</summary>
          <div className="flex gap-2">
            <button
              onClick={() => addCulture(currentPlayer.id, 5)}
              className="flex-1 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs"
            >
              문화+5
            </button>
            <button
              onClick={() => addCurrency(currentPlayer.id, 3)}
              className="flex-1 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs"
            >
              화폐+3
            </button>
            <button
              onClick={() => addTrade(currentPlayer.id, 5)}
              className="flex-1 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs"
            >
              교역+5
            </button>
          </div>
        </details>
      </div>

      {/* 🌟 모달 마운트 (이 영역은 화면의 최상단 레이어로 렌더링됩니다) */}
      <PioneerActionModal 
        isOpen={isPioneerModalOpen} 
        onClose={() => setIsPioneerModalOpen(false)} 
      />
    </div>
  );
}