import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { City, UnitType, UNIT_DEFINITIONS, Position, TERRAIN_PROPERTIES, BuildingDefinition, TerrainType } from '../../../types';
import { BUILDINGS, getAvailableBuildings } from '../../../constants/buildings';
import { getAvailableArmyCards, ArmyCardTemplate } from '../../../constants/armyCards';
import clsx from 'clsx';

type ProductionTab = 'buildings' | 'units' | 'armyCards';

interface ArmyCardProductionModalProps {
  template: ArmyCardTemplate;
  onSelect: (attack: number, health: number) => void;
  onClose: () => void;
}

// 공격력/체력 선택 모달
function ArmyCardProductionModal({ template, onSelect, onClose }: ArmyCardProductionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 w-80" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-lg font-semibold mb-4">{template.name} 생산</h3>
        <p className="text-slate-400 text-sm mb-4">
          총 전투력 {template.totalCombatPower}을 공격력/체력으로 분배하세요:
        </p>
        <div className="space-y-2">
          {template.attackHealthOptions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(option.attack, option.health)}
              className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
            >
              <span className="text-red-400">공격 {option.attack}</span>
              <span className="text-slate-400 mx-2">/</span>
              <span className="text-green-400">체력 {option.health}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// 건물 위치 선택 모달
interface BuildingLocationModalProps {
  building: BuildingDefinition;
  city: City;
  onSelect: (position: Position) => void;
  onClose: () => void;
}

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
};

function BuildingLocationModal({ building, city, onSelect, onClose }: BuildingLocationModalProps) {
  const { map } = useGameStore();

  // 도시 주변 8칸 + 도시 중앙 타일 가져오기
  const getAdjacentTiles = () => {
    const tiles: { position: Position; isValid: boolean; terrain: string; hasBuilding: boolean }[] = [];
    const directions = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },  { x: 0, y: 0 },  { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
    ];

    for (const dir of directions) {
      const x = city.position.x + dir.x;
      const y = city.position.y + dir.y;

      if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
        const tile = map.tiles[y][x];
        const isCenter = dir.x === 0 && dir.y === 0;
        const isValid = !tile.buildingId &&
          tile.terrain !== 'water' &&
          tile.terrain !== 'mountain' &&
          tile.ownerId === city.ownerId;

        tiles.push({
          position: { x, y },
          isValid: isCenter || isValid, // 도시 중앙은 항상 허용
          terrain: tile.terrain,
          hasBuilding: !!tile.buildingId || (isCenter && city.buildings.length > 0),
        });
      }
    }

    return tiles;
  };

  const adjacentTiles = getAdjacentTiles();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-lg font-semibold mb-2">{building.name} 건설 위치 선택</h3>
        <p className="text-slate-400 text-sm mb-4">도시 주변 타일 중 건설할 위치를 선택하세요</p>

        <div className="grid grid-cols-3 gap-1 mb-4">
          {adjacentTiles.map((tile, idx) => {
            const isCenter = tile.position.x === city.position.x && tile.position.y === city.position.y;
            return (
              <button
                key={idx}
                onClick={() => tile.isValid && onSelect(tile.position)}
                disabled={!tile.isValid}
                className={clsx(
                  'w-16 h-16 rounded flex flex-col items-center justify-center text-xs transition-all',
                  TERRAIN_COLORS[tile.terrain],
                  tile.isValid
                    ? 'hover:ring-2 hover:ring-amber-400 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed',
                  isCenter && 'ring-2 ring-white'
                )}
              >
                {isCenter && <span className="text-lg">🏛️</span>}
                {tile.hasBuilding && !isCenter && <span className="text-lg">🏗️</span>}
                <span className="text-[10px] text-white/80">
                  {TERRAIN_PROPERTIES[tile.terrain as TerrainType]?.name || tile.terrain}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 mb-4">
          <p>🏛️ = 도시 중앙 | 🏗️ = 이미 건물 있음</p>
          <p>어두운 타일 = 건설 불가 (물/산/소유권 없음)</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export function CityPanel() {
  const { players, currentPlayerIndex, currentPhase, buildInCity, createUnit, produceArmyCard } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [selectedCity, setSelectedCity] = useState<City | null>(
    currentPlayer.cities[0] || null
  );
  const [productionTab, setProductionTab] = useState<ProductionTab>('buildings');
  const [selectedArmyTemplate, setSelectedArmyTemplate] = useState<ArmyCardTemplate | null>(null);
  const [selectedBuildingToBuild, setSelectedBuildingToBuild] = useState<BuildingDefinition | null>(null);

  // 도시 경영 단계에서만 행동 가능
  const canManageCity = currentPhase === 'cityManagement';

  const researchedTechIds = currentPlayer.technologies.map((t) => t.id);
  const existingBuildingTypes = selectedCity?.buildings.map(b => b.type) || [];
  const availableBuildings = getAvailableBuildings(researchedTechIds, existingBuildingTypes);
  const availableArmyCards = getAvailableArmyCards(researchedTechIds);

  const militaryCount = currentPlayer.units.filter((u) => u.type === 'military').length;
  const settlerCount = currentPlayer.units.filter((u) => u.type === 'settler').length;

  if (currentPlayer.cities.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        도시가 없습니다. 개척자로 새 도시를 건설하세요.
      </div>
    );
  }

  const handleBuild = (building: BuildingDefinition) => {
    if (!canManageCity) {
      alert('도시 경영 단계에서만 건물을 건설할 수 있습니다.');
      return;
    }
    if (selectedCity) {
      // 위치 선택 모달 표시
      setSelectedBuildingToBuild(building);
    }
  };

  const handleBuildAtLocation = (position: Position) => {
    if (selectedCity && selectedBuildingToBuild) {
      buildInCity(selectedCity.id, selectedBuildingToBuild.type, position);
      setSelectedBuildingToBuild(null);
    }
  };

  const handleProduceUnit = (type: UnitType) => {
    if (!canManageCity) {
      alert('도시 경영 단계에서만 유닛을 생산할 수 있습니다.');
      return;
    }
    if (!selectedCity) return;

    if (type === 'military' && militaryCount >= 6) {
      alert('군사 유닛은 최대 6개까지만 생산할 수 있습니다.');
      return;
    }
    if (type === 'settler' && settlerCount >= 2) {
      alert('개척자는 최대 2개까지만 생산할 수 있습니다.');
      return;
    }

    createUnit(currentPlayer.id, type, selectedCity.position);
  };

  const handleProduceArmyCard = (attack: number, health: number) => {
    if (!canManageCity) {
      alert('도시 경영 단계에서만 부대 카드를 생산할 수 있습니다.');
      return;
    }
    if (!selectedArmyTemplate) return;
    produceArmyCard(
      currentPlayer.id,
      selectedArmyTemplate.type,
      selectedArmyTemplate.tier,
      attack,
      health,
      selectedArmyTemplate.name
    );
    setSelectedArmyTemplate(null);
  };

  return (
    <div className="flex gap-6">
      {/* 공격력/체력 선택 모달 */}
      {selectedArmyTemplate && (
        <ArmyCardProductionModal
          template={selectedArmyTemplate}
          onSelect={handleProduceArmyCard}
          onClose={() => setSelectedArmyTemplate(null)}
        />
      )}

      {/* 건물 위치 선택 모달 */}
      {selectedBuildingToBuild && selectedCity && (
        <BuildingLocationModal
          building={selectedBuildingToBuild}
          city={selectedCity}
          onSelect={handleBuildAtLocation}
          onClose={() => setSelectedBuildingToBuild(null)}
        />
      )}

      {/* 도시 목록 */}
      <div className="w-64 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">내 도시</h3>
        {currentPlayer.cities.map((city) => (
          <button
            key={city.id}
            onClick={() => setSelectedCity(city)}
            className={clsx(
              'w-full p-3 rounded-lg text-left transition-colors',
              selectedCity?.id === city.id
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            <div className="font-medium flex items-center gap-2">
              {city.isCapital && <span>👑</span>}
              {city.name}
            </div>
            <div className="text-sm opacity-75 mt-1">
              생산력: {city.production} | 건물: {city.buildings.length}
            </div>
          </button>
        ))}
      </div>

      {/* 선택된 도시 상세 */}
      {selectedCity && (
        <div className="flex-1">
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedCity.isCapital && '👑 '}
              {selectedCity.name}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-slate-300">
                <span className="text-orange-400">생산력:</span> {selectedCity.production}
              </div>
              <div className="text-slate-300">
                <span className="text-red-400">전투 보너스:</span> {selectedCity.combatBonus}
              </div>
              <div className="text-slate-300">
                <span className="text-blue-400">성벽:</span> {selectedCity.hasWalls ? '있음' : '없음'}
              </div>
            </div>
          </div>

          {/* 현재 건물 */}
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <h4 className="text-lg font-medium text-white mb-3">건설된 건물</h4>
            {selectedCity.buildings.length === 0 ? (
              <p className="text-slate-400">건설된 건물이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selectedCity.buildings.map((building) => {
                  const def = BUILDINGS[building.type];
                  return (
                    <div
                      key={building.id}
                      className="p-2 bg-slate-700 rounded text-sm"
                    >
                      <div className="text-white font-medium">{def.name}</div>
                      <div className="text-slate-400 text-xs">{def.description}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 생산 탭 */}
          <div className="bg-slate-800 rounded-lg p-4">
            {/* 단계 경고 */}
            {!canManageCity && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ 도시 경영 단계에서만 건물 건설, 유닛 생산, 부대 카드 생산이 가능합니다.
                </p>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setProductionTab('buildings')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm transition-colors',
                  productionTab === 'buildings'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                건물
              </button>
              <button
                onClick={() => setProductionTab('units')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm transition-colors',
                  productionTab === 'units'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                유닛
              </button>
              <button
                onClick={() => setProductionTab('armyCards')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm transition-colors',
                  productionTab === 'armyCards'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                부대 카드
              </button>
            </div>

            {/* 건물 탭 */}
            {productionTab === 'buildings' && (
              <div className="grid grid-cols-2 gap-2">
                {availableBuildings.map((building) => {
                  return (
                    <motion.button
                      key={building.type}
                      whileHover={canManageCity ? { scale: 1.02 } : {}}
                      onClick={() => handleBuild(building)}
                      disabled={!canManageCity}
                      className={clsx(
                        'p-3 rounded-lg text-left transition-colors',
                        canManageCity
                          ? 'bg-slate-700 hover:bg-slate-600'
                          : 'bg-slate-700 opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="text-white font-medium text-sm">{building.name}</div>
                      <div className="text-slate-400 text-xs mt-1">{building.description}</div>
                      <div className="text-amber-400 text-xs mt-1">
                        비용: {building.productionCost}
                      </div>
                    </motion.button>
                  );
                })}
                {availableBuildings.length === 0 && (
                  <p className="text-slate-400 col-span-2">건설 가능한 건물이 없습니다.</p>
                )}
              </div>
            )}

            {/* 유닛 탭 */}
            {productionTab === 'units' && (
              <div className="grid grid-cols-2 gap-2">
                {(['military', 'settler'] as UnitType[]).map((unitType) => {
                  const def = UNIT_DEFINITIONS[unitType];
                  const currentCount = unitType === 'military' ? militaryCount : settlerCount;
                  const maxCount = unitType === 'military' ? 6 : 2;
                  const isMaxed = currentCount >= maxCount;
                  const isDisabled = isMaxed || !canManageCity;

                  return (
                    <motion.button
                      key={unitType}
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      onClick={() => handleProduceUnit(unitType)}
                      disabled={isDisabled}
                      className={clsx(
                        'p-3 rounded-lg text-left transition-colors',
                        isDisabled
                          ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                          : 'bg-slate-700 hover:bg-slate-600'
                      )}
                    >
                      <div className="text-white font-medium text-sm flex items-center gap-2">
                        <span>{unitType === 'military' ? '⚔️' : '👷'}</span>
                        {def.name}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">{def.description}</div>
                      <div className="text-amber-400 text-xs mt-1">
                        비용: {def.productionCost}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        보유: {currentCount}/{maxCount}
                      </div>
                      {isMaxed && (
                        <div className="text-red-400 text-xs mt-1">최대치 도달</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 부대 카드 탭 */}
            {productionTab === 'armyCards' && (
              <div className="grid grid-cols-2 gap-2">
                {availableArmyCards.map((card) => {
                  const cardIcon = {
                    infantry: '🗡️',
                    artillery: '💣',
                    cavalry: '🐴',
                    airforce: '✈️',
                  }[card.type];

                  return (
                    <motion.button
                      key={`${card.type}-${card.tier}`}
                      whileHover={canManageCity ? { scale: 1.02 } : {}}
                      onClick={() => canManageCity && setSelectedArmyTemplate(card)}
                      disabled={!canManageCity}
                      className={clsx(
                        'p-3 rounded-lg text-left transition-colors',
                        canManageCity
                          ? 'bg-slate-700 hover:bg-slate-600'
                          : 'bg-slate-700 opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="text-white font-medium text-sm flex items-center gap-2">
                        <span>{cardIcon}</span>
                        {card.name}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        Tier {card.tier} | 총 전투력: {card.totalCombatPower}
                      </div>
                      <div className="text-amber-400 text-xs mt-1">
                        비용: {card.productionCost}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
