import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { Unit, UNIT_DEFINITIONS, Position } from '../../../types';
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
    
    // 🌟 [수정됨] 하드코딩되었던 `if (currentPlayer.cities.length >= 3) return false;` 삭제
    // 한도 초과 메시지를 렌더링하기 위해 일단 true를 반환하도록 허용합니다.

    // 도시 건설은 시작 단계에서만 가능
    if (currentPhase !== 'start') return false;

    const tile = map.tiles[selectedUnitData.position.y][selectedUnitData.position.x];
    if (tile.cityId) return false;

    return true;
  };

  const getFoundCityError = (): string | null => {
    if (!selectedUnitData || selectedUnitData.type !== 'settler') return null;

    // 🌟 [신규 추가] 동적 도시 한도 계산 (관개 기술 보유 여부 확인)
    const hasIrrigation = currentPlayer.technologies.some(tech => tech.id === 'irrigation');
    const maxCitiesLimit = hasIrrigation ? 3 : 2;

    if (currentPlayer.cities.length >= maxCitiesLimit) {
      return `⚠️ 최대 도시 건설 한도(${maxCitiesLimit}개)에 도달했습니다. ${!hasIrrigation ? '(관개 기술 연구 필요)' : ''}`;
    }

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
    <div className="panel-texture p-5 rounded-lg h-full flex flex-col">
      <div className="panel-content flex flex-col h-full">
        {/* 🌟 헤더 영역 */}
        <div className="flex justify-between items-center border-b border-amber-700/30 pb-2 mb-4">
          <h2 className="text-2xl font-serif font-black text-amber-400 text-glow-gold tracking-wide">
            ⚔️ 부대 및 개척자 지휘
          </h2>
          <span className="text-[10px] text-amber-200/60 font-serif px-2 py-1 bg-slate-950/50 border border-slate-700 rounded shadow-inner">전투 스탯은 부대 카드(🃏)에서 관리</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {/* 단계별 경고 */}
          {!canMove && currentPhase !== 'start' && (
            <div className="p-3 bg-yellow-950/60 border border-yellow-700/50 rounded-lg shadow-inner">
              <p className="text-yellow-400 text-sm font-serif font-bold">
                ⚠️ 부대 이동은 [이동 단계]에서만 지시할 수 있습니다.
              </p>
            </div>
          )}
          {currentPhase === 'start' && (
            <div className="p-3 bg-blue-950/60 border border-blue-700/50 rounded-lg shadow-inner">
              <p className="text-blue-300 text-sm font-serif font-bold">
                💡 시작 단계입니다. 선택한 개척자로 도시를 건설할 수 있습니다.
              </p>
            </div>
          )}

          {/* 🌟 유닛 보유 현황 요약 (보드게임 스타일) */}
          <div className="bg-slate-900/80 border border-amber-700/30 rounded-lg p-4 shadow-inner grid grid-cols-2 gap-4 text-sm font-serif">
            <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded border border-slate-700">
              <span className="text-slate-300 flex items-center gap-1.5"><span className="text-lg">⚔️</span> 군사 토큰</span>
              <span className="text-amber-100 font-cinzel font-bold text-lg">{militaryUnits.length}<span className="text-slate-500 text-xs ml-1">/6</span></span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded border border-slate-700">
              <span className="text-slate-300 flex items-center gap-1.5"><span className="text-lg">👷</span> 개척자 토큰</span>
              <span className="text-blue-200 font-cinzel font-bold text-lg">{settlerUnits.length}<span className="text-slate-500 text-xs ml-1">/2</span></span>
            </div>
          </div>

          {/* 🌟 그룹 선택 모드 스위치 */}
          <div className="bg-slate-900/60 border border-amber-700/30 rounded-lg p-3 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-sm text-amber-200/80 font-serif font-bold">다중 선택 모드 (부대 묶기)</span>
              {isGroupSelectMode && <p className="text-[10px] text-slate-400 mt-0.5">여러 부대 토큰을 클릭해 함께 이동시킬 수 있습니다.</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
                <button
                onClick={() => setIsGroupSelectMode(!isGroupSelectMode)}
                className={clsx(
                    'px-4 py-1.5 text-xs font-serif font-bold rounded transition-all border',
                    isGroupSelectMode
                    ? 'bg-amber-600 text-white border-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.5)]'
                    : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-amber-100'
                )}
                >
                {isGroupSelectMode ? '활성화 됨' : '비활성화'}
                </button>
                {selectedUnits.length > 0 && (
                    <button onClick={handleDeselectAll} className="text-[10px] text-red-400 hover:text-red-300 underline font-sans">
                        {selectedUnits.length}개 선택 해제
                    </button>
                )}
            </div>
          </div>

          {/* 🌟 유닛 목록 (물리적 토큰 느낌) */}
          <div className="space-y-2.5">
            {currentPlayer.units.length === 0 ? (
              <p className="text-slate-500 text-sm font-serif italic text-center py-4 bg-slate-900/40 rounded-lg border border-slate-700/30">맵에 배치된 부대가 없습니다.</p>
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
                      'w-full p-3 rounded-md text-left transition-all border shadow-sm font-serif flex items-center gap-4',
                      isSelected
                        ? 'bg-amber-900/40 border-amber-500 text-amber-200 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)] text-glow-gold transform scale-[1.01]'
                        : isInGroup
                        ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 shadow-[inset_0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-amber-700/50 hover:text-amber-100'
                    )}
                  >
                    {isGroupSelectMode && (
                      <div className={clsx(
                        'w-5 h-5 rounded flex items-center justify-center text-xs border transition-colors',
                        isInGroup ? 'bg-amber-500 border-amber-400 text-black shadow-glow-gold' : 'bg-slate-900 border-slate-600'
                      )}>
                        {isInGroup && '✔'}
                      </div>
                    )}
                    <span className="text-3xl drop-shadow-lg filter">{UNIT_ICONS[unit.type]}</span>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="font-bold text-lg text-amber-100">{def.name}</div>
                      <div className="text-xs text-slate-400 mt-1 font-sans flex items-center gap-3">
                        <span className="bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-700">
                          맵 좌표 <span className="font-cinzel text-amber-400 ml-1">({unit.position.x}, {unit.position.y})</span>
                        </span>
                        <span className="bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-700">
                          기동력 <span className={clsx("font-cinzel ml-1 font-bold", unit.movement > 0 ? "text-green-400" : "text-red-400")}>{unit.movement}</span>
                          <span className="font-cinzel text-slate-600 text-[10px]">/{unit.maxMovement}</span>
                        </span>
                      </div>
                    </div>
                    {unit.movement <= 0 && (
                      <span className="text-[10px] font-bold bg-red-900/60 text-red-200 border border-red-700/50 px-2 py-1 rounded shadow-inner whitespace-nowrap">행동 종료</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* 🌟 선택된 유닛 상세 액션 (보드게임 액션 창) */}
          {selectedUnitData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/80 border border-amber-700/50 shadow-inner rounded-lg p-5 mt-4 space-y-4"
            >
              {/* 같은 타일 묶기 UI */}
              {unitsOnSameTile.length > 1 && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-amber-700/30">
                  <span className="text-xs font-serif text-amber-200/80">
                    📍 이 좌표에 <span className="font-cinzel text-amber-400 font-bold text-sm">{unitsOnSameTile.length}</span>개의 토큰이 겹쳐 있습니다.
                  </span>
                  <button
                    onClick={handleSelectAllOnTile}
                    className="text-xs font-serif font-bold px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded border border-amber-500 shadow-sm transition-colors"
                  >
                    이 타일 전체 묶기
                  </button>
                </div>
              )}

              <h4 className="font-serif font-black text-amber-500 text-glow-gold text-lg">
                {selectedUnits.length > 1 ? (
                  <span>다중 선택된 부대 지휘 ({selectedUnits.length}개)</span>
                ) : (
                  <span className="flex items-center gap-2">{UNIT_ICONS[selectedUnitData.type]} {UNIT_DEFINITIONS[selectedUnitData.type].name} 지휘</span>
                )}
              </h4>

              {selectedUnits.length > 1 && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-950/50 rounded border border-slate-700">
                  {selectedUnitsData.map((unit) => (
                    <span key={unit.id} className={clsx("text-sm border px-2 py-0.5 rounded flex items-center gap-1 shadow-sm", unit.movement > 0 ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300")}>
                      {UNIT_ICONS[unit.type]} {unit.movement > 0 ? '✔' : '✘'}
                    </span>
                  ))}
                </div>
              )}

              {/* 🌟 탐험 버튼 (손맛 나는 디자인) */}
              {explorableChunks.length > 0 && (
                <div className="bg-slate-950/80 p-4 rounded-lg border border-indigo-700/50 mt-2 shadow-inner">
                  <p className="text-sm font-serif font-bold text-indigo-300 mb-3 text-shadow-[0_0_5px_rgba(99,102,241,0.5)]">🔭 미지의 안개 탐험 <span className="text-xs font-sans text-indigo-400/60 font-normal ml-1">(기동력 1 소모)</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    {explorableChunks.map((chunk, idx) => (
                      <button
                        key={idx}
                        onClick={() => exploreChunk(selectedUnitData.id, chunk.chunkPos)}
                        className="px-3 py-2.5 bg-gradient-to-br from-indigo-700 to-indigo-900 hover:from-indigo-600 hover:to-indigo-800 text-indigo-100 font-serif font-bold text-sm rounded border border-indigo-500 shadow-md transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        <span className="text-lg drop-shadow">🔦</span> {chunk.direction} 개방
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 🌟 도시 건설 UI */}
              {selectedUnitData.type === 'settler' && canFoundCity() && (
                <div className="pt-2">
                  {getFoundCityError() ? (
                    <div className="p-3 bg-red-950/80 border border-red-600 rounded-lg shadow-inner">
                      <p className="text-red-400 text-sm font-serif font-bold flex items-center gap-2"><span>⚠️</span> {getFoundCityError()}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFoundCityModal(true)}
                      className="w-full py-3 bg-gradient-to-r from-blue-700 to-sky-700 hover:from-blue-600 hover:to-sky-600 border border-blue-400 text-white rounded-lg text-sm font-serif font-bold shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-all transform hover:scale-[1.02]"
                    >
                      ⛺ 이 타일에 새 도시 개척
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* 🌟 도시 건설 모달 (양피지 테마) */}
      {showFoundCityModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="panel-texture rounded-xl p-7 w-96 shadow-2xl border-amber-500/50"
          >
            <div className="panel-content">
              <h4 className="text-2xl font-serif font-black text-amber-400 text-glow-gold mb-2 text-center border-b border-amber-700/30 pb-3">⛺ 새로운 도시 명명</h4>
              <p className="text-xs text-amber-200/60 font-serif text-center mb-5">위대한 문명의 초석이 될 도시의 이름을 지어주십시오.</p>
              
              <input
                type="text"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Ex. 로마, 워싱턴, 장안"
                className="w-full px-4 py-3 bg-slate-950 text-amber-100 font-serif font-bold rounded-lg border border-amber-700/50 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 mb-6 shadow-inner text-center placeholder-slate-600"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFoundCityModal(false);
                    setNewCityName('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-serif font-bold rounded-lg transition-colors shadow-sm"
                >
                  명령 취소
                </button>
                <button
                  onClick={handleFoundCity}
                  disabled={!newCityName.trim()}
                  className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600 border border-amber-500 text-amber-50 font-serif font-bold rounded-lg transition-colors shadow-glow-gold"
                >
                  도시 개척
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}