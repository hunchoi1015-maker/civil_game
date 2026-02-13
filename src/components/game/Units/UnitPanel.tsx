import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { Unit, UNIT_DEFINITIONS, Position, BASE_STACKING_LIMIT } from '../../../types';
import clsx from 'clsx';

const UNIT_ICONS: Record<string, string> = {
  military: '⚔️',
  settler: '👷',
};

export function UnitPanel() {
  const {
    players,
    currentPlayerIndex,
    map,
    selectedUnit,
    selectedUnits,
    setSelectedUnit,
    setSelectedUnits,
    toggleUnitSelection,
    setSelectedTile,
    moveSelectedUnits,
    removeUnit,
    foundCity,
    currentPhase,
    exploreChunk,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];
  const [showFoundCityModal, setShowFoundCityModal] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [isGroupSelectMode, setIsGroupSelectMode] = useState(false);

  const militaryUnits = currentPlayer.units.filter((u) => u.type === 'military');
  const settlerUnits = currentPlayer.units.filter((u) => u.type === 'settler');

  const selectedUnitData = selectedUnit
    ? currentPlayer.units.find((u) => u.id === selectedUnit)
    : null;

  // 선택된 유닛들의 데이터
  const selectedUnitsData = selectedUnits
    .map((id) => currentPlayer.units.find((u) => u.id === id))
    .filter((u): u is Unit => u !== undefined);

  // 같은 타일에 있는 유닛들
  const unitsOnSameTile = selectedUnitData
    ? currentPlayer.units.filter(
        (u) => u.position.x === selectedUnitData.position.x && u.position.y === selectedUnitData.position.y
      )
    : [];

  const handleSelectUnit = (unit: Unit, event?: React.MouseEvent) => {
    if (isGroupSelectMode || event?.shiftKey) {
      toggleUnitSelection(unit.id);
    } else {
      setSelectedUnit(unit.id);
      setSelectedTile(unit.position);
    }
  };

  const handleSelectAllOnTile = () => {
    if (selectedUnitData) {
      const unitIds = unitsOnSameTile.map((u) => u.id);
      setSelectedUnits(unitIds);
    }
  };

  const handleDeselectAll = () => {
    setSelectedUnits([]);
    setSelectedUnit(null);
  };

  // 현재 플레이어의 스태킹 제한 계산
  const stackingLimit = BASE_STACKING_LIMIT + currentPlayer.stackingLimitBonus;

  // 주변 4칸에 적대적인 유닛이 있는지 확인 (상하좌우)
  const hasHostileNearby = (position: Position): boolean => {
    const directions = [
      { x: 0, y: -1 },  // 상
      { x: -1, y: 0 },  // 좌
      { x: 1, y: 0 },   // 우
      { x: 0, y: 1 },   // 하
    ];

    for (const dir of directions) {
      const x = position.x + dir.x;
      const y = position.y + dir.y;

      if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
        const tile = map.tiles[y][x];
        // 적대적인 유닛 확인
        for (const unitId of tile.unitIds) {
          for (const player of players) {
            if (player.id !== currentPlayer.id) {
              const hostileUnit = player.units.find(u => u.id === unitId);
              if (hostileUnit) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };

  // 다른 도시와 최소 2칸 이상 떨어져 있는지 확인
  const isTooCloseToOtherCity = (position: Position): boolean => {
    for (const player of players) {
      for (const city of player.cities) {
        const dx = Math.abs(city.position.x - position.x);
        const dy = Math.abs(city.position.y - position.y);
        // 체비셰프 거리로 2칸 미만이면 너무 가까움
        if (Math.max(dx, dy) < 3) {
          return true;
        }
      }
    }
    return false;
  };

  const canFoundCity = () => {
    if (!selectedUnitData || selectedUnitData.type !== 'settler') return false;
    if (currentPlayer.cities.length >= 3) return false;
    // 도시 건설은 시작 단계에서만 가능
    if (currentPhase !== 'start') return false;

    const tile = map.tiles[selectedUnitData.position.y][selectedUnitData.position.x];
    if (tile.cityId) return false;

    return true;
  };

  const getFoundCityError = (): string | null => {
    if (!selectedUnitData || selectedUnitData.type !== 'settler') return null;

    const pos = selectedUnitData.position;

    if (hasHostileNearby(pos)) {
      return '주변 8칸에 적대적인 유닛이 있어 도시를 건설할 수 없습니다.';
    }

    if (isTooCloseToOtherCity(pos)) {
      return '다른 도시와 최소 3칸 이상 떨어져야 합니다.';
    }

    return null;
  };

  const handleFoundCity = () => {
    if (!selectedUnitData || selectedUnitData.type !== 'settler' || !newCityName.trim()) return;

    const error = getFoundCityError();
    if (error) {
      alert(error);
      return;
    }

    foundCity(currentPlayer.id, selectedUnitData.position, newCityName.trim());
    removeUnit(selectedUnitData.id);
    setShowFoundCityModal(false);
    setNewCityName('');
    setSelectedUnit(null);
  };

  // 탐험 가능한 인접 청크 찾기
  const getExplorableChunks = (unit: Unit) => {
    if (unit.movement < 1) return [];

    const currentChunkX = Math.floor(unit.position.x / 4);
    const currentChunkY = Math.floor(unit.position.y / 4);
    
    const candidates: { direction: string; chunkPos: Position }[] = [];
    const directions = [
      { label: '북쪽', dx: 0, dy: -1 },
      { label: '남쪽', dx: 0, dy: 1 },
      { label: '서쪽', dx: -1, dy: 0 },
      { label: '동쪽', dx: 1, dy: 0 },
    ];

    for (const dir of directions) {
      const neighborTileX = unit.position.x + dir.dx;
      const neighborTileY = unit.position.y + dir.dy;

      // 맵 범위 내인지 확인
      if (neighborTileX >= 0 && neighborTileX < map.width && neighborTileY >= 0 && neighborTileY < map.height) {
        const targetChunkX = Math.floor(neighborTileX / 4);
        const targetChunkY = Math.floor(neighborTileY / 4);

        // 다른 청크이고, 아직 탐험되지 않았다면 후보에 추가
        if ((targetChunkX !== currentChunkX || targetChunkY !== currentChunkY)) {
           // 해당 청크의 첫 번째 타일(혹은 아무 타일)의 상태를 확인
           const targetTile = map.tiles[targetChunkY * 4][targetChunkX * 4];
           if (!targetTile.isExplored) {
             candidates.push({ 
               direction: dir.label, 
               chunkPos: { x: targetChunkX, y: targetChunkY } 
             });
           }
        }
      }
    }
    
    // 중복 제거
    const uniqueCandidates = candidates.filter((c, index, self) => 
      index === self.findIndex((t) => (
        t.chunkPos.x === c.chunkPos.x && t.chunkPos.y === c.chunkPos.y
      ))
    );

    return uniqueCandidates;
  };

  const explorableChunks = selectedUnitData ? getExplorableChunks(selectedUnitData) : [];

  // 이동 단계 여부
  const canMove = currentPhase === 'movement';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">유닛 관리</h3>

      {/* 단계별 경고 */}
      {!canMove && currentPhase !== 'start' && (
        <div className="p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ 이동 단계에서만 유닛 이동이 가능합니다.
          </p>
        </div>
      )}
      {currentPhase === 'start' && (
        <div className="p-3 bg-blue-900/50 border border-blue-600 rounded-lg">
          <p className="text-blue-400 text-sm">
            💡 시작 단계에서 개척자로 도시를 건설할 수 있습니다.
          </p>
        </div>
      )}

      {/* 유닛 현황 */}
      <div className="bg-slate-700 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-300">
            <span className="text-red-400">군사:</span> {militaryUnits.length}/6
          </div>
          <div className="text-slate-300">
            <span className="text-blue-400">개척자:</span> {settlerUnits.length}/2
          </div>
        </div>
      </div>

      {/* 그룹 선택 모드 */}
      <div className="bg-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">그룹 선택 모드</span>
          <button
            onClick={() => setIsGroupSelectMode(!isGroupSelectMode)}
            className={clsx(
              'px-3 py-1 text-xs rounded transition-colors',
              isGroupSelectMode
                ? 'bg-amber-600 text-white'
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            )}
          >
            {isGroupSelectMode ? 'ON' : 'OFF'}
          </button>
        </div>
        {isGroupSelectMode && (
          <p className="text-xs text-slate-400 mt-2">
            유닛을 클릭하여 여러 유닛을 선택하세요
          </p>
        )}
        {selectedUnits.length > 0 && (
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-amber-400">
              선택됨: {selectedUnits.length}개
            </span>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-red-400 hover:text-red-300"
            >
              선택 해제
            </button>
          </div>
        )}
      </div>

      {/* 유닛 목록 */}
      <div className="space-y-2">
        {currentPlayer.units.length === 0 ? (
          <p className="text-slate-400 text-sm">보유한 유닛이 없습니다.</p>
        ) : (
          currentPlayer.units.map((unit) => {
            const def = UNIT_DEFINITIONS[unit.type];
            const isSelected = selectedUnit === unit.id;
            const isInGroup = selectedUnits.includes(unit.id);

            return (
              <button
                key={unit.id}
                onClick={(e) => handleSelectUnit(unit, e)}
                className={clsx(
                  'w-full p-3 rounded-lg text-left transition-colors',
                  isSelected
                    ? 'bg-amber-600 text-white'
                    : isInGroup
                    ? 'bg-amber-700/50 text-white ring-1 ring-amber-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                <div className="flex items-center gap-2">
                  {isGroupSelectMode && (
                    <span className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center text-xs',
                      isInGroup ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
                    )}>
                      {isInGroup && '✓'}
                    </span>
                  )}
                  <span className="text-xl">{UNIT_ICONS[unit.type]}</span>
                  <div className="flex-1">
                    <div className="font-medium">{def.name}</div>
                    <div className="text-xs opacity-75">
                      위치: ({unit.position.x}, {unit.position.y}) | 이동력: {unit.movement}/{unit.maxMovement}
                    </div>
                  </div>
                  {unit.movement <= 0 && (
                    <span className="text-xs bg-slate-600 px-2 py-1 rounded">이동완료</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 선택된 유닛 액션 */}
      {selectedUnitData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-700 rounded-lg p-4 space-y-3"
        >
          {/* 같은 타일 유닛 그룹 선택 */}
          {unitsOnSameTile.length > 1 && (
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-600">
              <span className="text-xs text-slate-400">
                이 타일에 {unitsOnSameTile.length}개 유닛
              </span>
              <button
                onClick={handleSelectAllOnTile}
                className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded"
              >
                모두 선택
              </button>
            </div>
          )}

          <h4 className="font-medium text-white">
            {selectedUnits.length > 1 ? (
              <span>선택된 유닛 {selectedUnits.length}개</span>
            ) : (
              <span>{UNIT_ICONS[selectedUnitData.type]} {UNIT_DEFINITIONS[selectedUnitData.type].name}</span>
            )}
          </h4>

          {/* 그룹 선택 시 선택된 유닛 목록 */}
          {selectedUnits.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {selectedUnitsData.map((unit) => (
                <span key={unit.id} className="text-xs bg-slate-600 px-2 py-1 rounded">
                  {UNIT_ICONS[unit.type]} {unit.movement > 0 ? '✓' : '✗'}
                </span>
              ))}
            </div>
          )}

          {/* 탐험 버튼 섹션 */}
          {explorableChunks.length > 0 && (
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600 mt-2">
              <p className="text-xs text-slate-400 mb-2">🔭 미지의 구역 탐험 (이동력 1 소모):</p>
              <div className="grid grid-cols-2 gap-2">
                {explorableChunks.map((chunk, idx) => (
                  <button
                    key={idx}
                    onClick={() => exploreChunk(selectedUnitData.id, chunk.chunkPos)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <span>🔦</span> {chunk.direction} 구역 개방
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 좌표 이동 버튼 삭제됨 */}

          {selectedUnitData.type === 'settler' && canFoundCity() && (
            <>
              {getFoundCityError() ? (
                <div className="p-2 bg-red-900/50 border border-red-600 rounded-lg">
                  <p className="text-red-400 text-sm">{getFoundCityError()}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowFoundCityModal(true)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                >
                  이 위치에 도시 건설
                </button>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* 도시 건설 모달 */}
      {showFoundCityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-lg p-6 w-80"
          >
            <h4 className="text-lg font-semibold text-white mb-4">새 도시 건설</h4>
            <input
              type="text"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="도시 이름"
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleFoundCity}
                disabled={!newCityName.trim()}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                건설
              </button>
              <button
                onClick={() => {
                  setShowFoundCityModal(false);
                  setNewCityName('');
                }}
                className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}