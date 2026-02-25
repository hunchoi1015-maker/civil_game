import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { City, UnitType, UNIT_DEFINITIONS, Position, TERRAIN_PROPERTIES, BuildingDefinition, TerrainType } from '../../../types';
import { BUILDINGS, getAvailableBuildings } from '../../../constants/buildings';
import { getAvailableArmyCards, ArmyCardTemplate } from '../../../constants/armyCards';
import { calculateCityProduction, calculateCityCulture } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { ResourceType } from '../../../types/map';
import { getNextStepCost, CULTURE_TRACK_MAX } from '../../../constants/culture';
import { CultureTrackModal } from '../CultureTrackModal';
import { WONDERS, WonderType, WonderDefinition } from '../../../types/wonder'; 

type ProductionTab = 'buildings' | 'units' | 'armyCards' | 'wonders';

interface ArmyCardProductionModalProps {
  template: ArmyCardTemplate;
  onSelect: (attack: number, health: number) => void;
  onClose: () => void;
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  spice: '향료',
  wheat: '밀',
  silk: '비단',
  iron: '철',
  none: '없음',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  spice: '🏺',
  wheat: '🌾',
  silk: '🧣',
  iron: '⛏️',
  none: '',
};

const TERRAIN_COLORS: Record<string, string> = {
  grassland: 'bg-green-600',
  forest: 'bg-green-800',
  mountain: 'bg-stone-500',
  desert: 'bg-yellow-600',
  water: 'bg-blue-500',
};

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
        <button onClick={onClose} className="mt-4 w-full py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500">
          취소
        </button>
      </div>
    </div>
  );
}

interface LocationModalProps {
  name: string;
  city: City;
  onSelect: (position: Position) => void;
  onClose: () => void;
  isWonder?: boolean;
}

function LocationModal({ name, city, onSelect, onClose, isWonder = false }: LocationModalProps) {
  const { map } = useGameStore();

  const getAdjacentTiles = () => {
    if (!map) return []; 
    const tiles: { position: Position; isValid: boolean; terrain: string; hasBuilding: boolean; hasWonder: boolean }[] = [];
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
        
        let isValid = !tile.buildingType && !tile.wonder && tile.terrain !== 'water' && tile.terrain !== 'mountain' && tile.ownerId === city.ownerId;
        if (isWonder && isCenter) isValid = false;
        if (!isWonder && isCenter) isValid = true;

        tiles.push({
          position: { x, y },
          isValid,
          terrain: tile.terrain,
          hasBuilding: !!tile.buildingType || (isCenter && city.buildings.length > 0),
          hasWonder: !!tile.wonder,
        });
      }
    }
    return tiles;
  };

  const adjacentTiles = getAdjacentTiles();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-lg font-semibold mb-2">{name} 건설 위치 선택</h3>
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
                  'w-16 h-16 rounded flex flex-col items-center justify-center text-xs transition-all relative',
                  TERRAIN_COLORS[tile.terrain],
                  tile.isValid ? 'hover:ring-2 hover:ring-amber-400 cursor-pointer' : 'opacity-40 cursor-not-allowed',
                  isCenter && 'ring-2 ring-white'
                )}
              >
                {isCenter && <span className="text-lg z-10">🏛️</span>}
                {tile.hasBuilding && !isCenter && <span className="text-lg z-10">🏗️</span>}
                {tile.hasWonder && <span className="text-lg z-10">🗽</span>}
                <span className="text-[10px] text-white/80 z-10 mt-1">
                  {TERRAIN_PROPERTIES[tile.terrain as TerrainType]?.name || tile.terrain}
                </span>
              </button>
            );
          })}
        </div>

        {/* [복구] 아이콘 및 색상 범례 설명 */}
        <div className="text-xs text-slate-500 mb-4 text-center">
          <p>🏛️ = 도시 중앙 | 🏗️ = 지어진 건물 | 🗽 = 불가사의</p>
          <p>어두운 타일 = 건설 불가 (물/산/소유권 없음/이미 지어짐)</p>
        </div>

        <button onClick={onClose} className="w-full py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500">
          취소
        </button>
      </div>
    </div>
  );
}

export interface CityPanelProps {
  city?: City; 
  onClose?: () => void;
}

export function CityPanel({ city: initialCity }: CityPanelProps) {
  const { 
    players, 
    currentPlayerIndex, 
    currentPhase, 
    buildInCity, 
    createUnit, 
    produceArmyCard, 
    harvestCityCulture, 
    harvestResource, 
    constructWonder,
    map, 
    advanceCultureTrack
  } = useGameStore();
  
  const currentPlayer = players[currentPlayerIndex];
  
  const [selectedCityId, setSelectedCityId] = useState<string | null>(initialCity?.id || currentPlayer.cities[0]?.id || null);
  const selectedCity = currentPlayer.cities.find(c => c.id === selectedCityId) || null;
  
  const [productionTab, setProductionTab] = useState<ProductionTab>('buildings');
  const [selectedArmyTemplate, setSelectedArmyTemplate] = useState<ArmyCardTemplate | null>(null);
  const [selectedBuildingToBuild, setSelectedBuildingToBuild] = useState<BuildingDefinition | null>(null);
  const [selectedWonderToBuild, setSelectedWonderToBuild] = useState<WonderDefinition | null>(null);
  const [showCultureModal, setShowCultureModal] = useState(false);

  const canManageCity = currentPhase === 'cityManagement';
  const isOwner = selectedCity?.ownerId === currentPlayer.id;

  const availableResources = useMemo(() => {
    if (!selectedCity || !map) return [];
    const resources = new Set<ResourceType>();
    const cx = selectedCity.position.x;
    const cy = selectedCity.position.y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          const t = map.tiles[ny][nx];
          if (t.resource !== 'none') resources.add(t.resource);
        }
      }
    }
    return Array.from(resources);
  }, [selectedCity, map]);

  const researchedTechIds = currentPlayer.technologies.map((t) => t.id);
  const existingBuildingTypes = selectedCity?.buildings.map(b => b.type) || [];
  const availableBuildings = getAvailableBuildings(researchedTechIds, existingBuildingTypes).filter(b => !b.isWonder);
  const availableArmyCards = getAvailableArmyCards(researchedTechIds);

  const militaryCount = currentPlayer.units.filter((u) => u.type === 'military').length;
  const settlerCount = currentPlayer.units.filter((u) => u.type === 'settler').length;

  const selectedCityProduction = (selectedCity && map) ? calculateCityProduction(selectedCity, map) : 0;
  
  let selectedCityCulture = 0;
  if (selectedCity && map) {
      // 1. 기본 수확량 + 1 보장
      selectedCityCulture = calculateCityCulture(selectedCity, map) + 1;
      
      // 2. 수도일 경우 정치체제 보너스/페널티 적용
      if (selectedCity.isCapital) {
          if (currentPlayer.government === 'monarchy') {
              selectedCityCulture += 1;
          } else if (currentPlayer.government === 'communism') {
              selectedCityCulture -= 1;
          }
      }
  }

  const nextCultureCost = getNextStepCost(currentPlayer.cultureTrack);
  const canAdvanceCulture = 
    currentPlayer.resources.culture >= nextCultureCost.culture && 
    currentPlayer.resources.trade >= nextCultureCost.trade &&
    currentPlayer.cultureTrack < CULTURE_TRACK_MAX;

  const handleBuild = (building: BuildingDefinition) => {
    if (!canManageCity || selectedCity?.hasActedThisTurn) return;
    if (selectedCityProduction < building.productionCost) {
      alert(`생산력이 부족합니다. (현재: ${selectedCityProduction}, 필요: ${building.productionCost})`);
      return;
    }
    setSelectedBuildingToBuild(building);
  };

  const handleBuildWonder = (wonder: WonderDefinition) => {
    if (!canManageCity || selectedCity?.hasActedThisTurn) return;

    // 🌟 할인 로직이 적용된 실제 비용 계산
    let actualCost = wonder.cost;
    if (wonder.costReductionTech && currentPlayer.technologies.some(t => t.id === wonder.costReductionTech)) {
        actualCost = Math.max(1, actualCost - wonder.costReductionAmount!);
    }

    if (selectedCityProduction < actualCost) {
      alert(`생산력이 부족합니다. (현재: ${selectedCityProduction}, 필요: ${actualCost})`);
      return;
    }
    
    // 🌟 타겟팅 모드 대신 기존처럼 모달을 띄우기 위해 상태 업데이트!
    setSelectedWonderToBuild(wonder);
  };

  const handleBuildAtLocation = (position: Position) => {
    if (selectedCity && selectedBuildingToBuild) {
      buildInCity(selectedCity.id, selectedBuildingToBuild.type, position);
      setSelectedBuildingToBuild(null);
    }
  };

  const handleWonderAtLocation = (position: Position) => {
    if (selectedCity && selectedWonderToBuild) {
      constructWonder(selectedCity.id, selectedWonderToBuild.type, position);
      setSelectedWonderToBuild(null);
    }
  };

  const handleProduceUnit = (type: UnitType) => {
    if (!canManageCity || !selectedCity || selectedCity.hasActedThisTurn) return;
    const def = UNIT_DEFINITIONS[type];
    if (selectedCityProduction < def.productionCost) return alert('생산력이 부족합니다.');
    if (type === 'military' && militaryCount >= 6) return alert('군사 유닛 한도 도달.');
    if (type === 'settler' && settlerCount >= 2) return alert('개척자 한도 도달.');
    createUnit(currentPlayer.id, type, selectedCity.position);
  };

  const handleProduceArmyCard = (attack: number, health: number) => {
    if (!selectedCity) return;
    if (!canManageCity || !selectedArmyTemplate || selectedCity?.hasActedThisTurn) return;
    if (selectedCityProduction < selectedArmyTemplate.productionCost) return alert('생산력이 부족합니다.');
    produceArmyCard(currentPlayer.id, selectedArmyTemplate.type, selectedArmyTemplate.tier, attack, health, selectedArmyTemplate.name, selectedCity.id);
    setSelectedArmyTemplate(null);
  };

  const handleHarvestCulture = () => {
    if (!canManageCity || !selectedCity || selectedCity.hasHarvestedCulture) return;
    harvestCityCulture(currentPlayer.id, selectedCity.id);
  };

  const handleHarvestResource = (resource: ResourceType) => {
    if (!canManageCity || !selectedCity || selectedCity.hasActedThisTurn || !isOwner) return;
    harvestResource(currentPlayer.id, selectedCity.id, resource);
  };

  if (currentPlayer.cities.length === 0) {
    return <div className="text-center text-slate-400 py-8">도시가 없습니다.</div>;
  }

  return (
    <div className="flex gap-6">
      {selectedArmyTemplate && <ArmyCardProductionModal template={selectedArmyTemplate} onSelect={handleProduceArmyCard} onClose={() => setSelectedArmyTemplate(null)} />}
      
      {selectedBuildingToBuild && selectedCity && (
        <LocationModal name={selectedBuildingToBuild.name} city={selectedCity} onSelect={handleBuildAtLocation} onClose={() => setSelectedBuildingToBuild(null)} />
      )}

      {selectedWonderToBuild && selectedCity && (
        <LocationModal name={selectedWonderToBuild.name} city={selectedCity} onSelect={handleWonderAtLocation} onClose={() => setSelectedWonderToBuild(null)} isWonder={true} />
      )}
      
      {showCultureModal && <CultureTrackModal onClose={() => setShowCultureModal(false)} />}
      
      {/* 도시 목록 */}
      <div className="w-64 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">내 도시</h3>
        {currentPlayer.cities.map((city) => (
          <button
            key={city.id}
            onClick={() => setSelectedCityId(city.id)}
            className={clsx(
              'w-full p-3 rounded-lg text-left transition-colors',
              selectedCity?.id === city.id ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            <div className="font-medium flex items-center gap-2">{city.isCapital && <span>👑</span>} {city.name}</div>
            <div className="text-sm opacity-75 mt-1">생산력: {map ? calculateCityProduction(city, map) : 0} | 건물: {city.buildings.length}</div>
          </button>
        ))}
      </div>

      {/* 선택된 도시 상세 */}
      {selectedCity && (
        <div className="flex-1 max-h-[80vh] overflow-y-auto pr-2">
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">{selectedCity.isCapital && '👑 '}{selectedCity.name}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-slate-300"><span className="text-orange-400">생산력:</span> {selectedCityProduction}</div>
              <div className="text-slate-300"><span className="text-red-400">방어 보너스:</span> +{selectedCity.cityDefenseBonus}</div>
              <div className="text-slate-300"><span className="text-blue-400">성벽:</span> {selectedCity.hasWalls ? '있음' : '없음'}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center text-sm">
                <span className="text-slate-400">이번 턴 행동:</span>
                <span className={selectedCity.hasActedThisTurn ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                    {selectedCity.hasActedThisTurn ? '완료 (행동 불가)' : '가능'}
                </span>
            </div>
          </div>

          {/* 문화 트랙 버튼 */}
          {canManageCity && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-purple-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl">🎭</div>
              <div className="flex justify-between items-center mb-3 relative z-10">
                <h4 className="text-lg font-bold text-purple-400 flex items-center gap-2"><span>🎭</span> 문명 문화 증진</h4>
                <button onClick={() => setShowCultureModal(true)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300">전체 트랙 보기</button>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg relative z-10">
                <div>
                  <div className="text-sm text-white mb-1">
                    현재 트랙: <span className="font-bold text-purple-400 text-lg">{currentPlayer.cultureTrack}</span> / {CULTURE_TRACK_MAX}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>다음 단계 비용:</span>
                    <span className={clsx("font-bold flex items-center gap-1", currentPlayer.resources.culture >= nextCultureCost.culture ? "text-purple-300" : "text-red-400")}>🎭 {nextCultureCost.culture}</span>
                    <span className={clsx("font-bold flex items-center gap-1", currentPlayer.resources.trade >= nextCultureCost.trade ? "text-amber-300" : "text-red-400")}>📦 {nextCultureCost.trade}</span>
                  </div>
                </div>
                <button onClick={advanceCultureTrack} disabled={!canAdvanceCulture} className={clsx("px-5 py-2 rounded-lg text-sm font-bold shadow-lg", canAdvanceCulture ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transform hover:scale-105" : "bg-slate-700 text-slate-500 cursor-not-allowed")}>
                  문화 증진
                </button>
              </div>
            </div>
          )}

          {/* 사치품 수확 */}
          {availableResources.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-amber-700/50">
                <h4 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2"><span>🌾</span> 사치품 수확 (주변 8칸)</h4>
                <div className="flex flex-wrap gap-2">
                    {availableResources.map((resource) => (
                        <button key={resource} onClick={() => handleHarvestResource(resource)} disabled={!isOwner || selectedCity.hasActedThisTurn || !canManageCity} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border', (!isOwner || selectedCity.hasActedThisTurn || !canManageCity) ? 'bg-slate-700 border-slate-600 opacity-50' : 'bg-slate-700 border-amber-600 hover:bg-amber-900 text-white')}>
                            <span className="text-lg">{RESOURCE_ICONS[resource]}</span>
                            <span>{RESOURCE_NAMES[resource]} (+1)</span>
                        </button>
                    ))}
                </div>
            </div>
          )}

          {/* 문화 수확 */}
          {canManageCity && selectedCityCulture > 0 && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 flex justify-between items-center border border-purple-900/30">
                <div>
                  <h4 className="text-md font-bold text-purple-300">📜 문화 생산</h4>
                  <p className="text-xs text-slate-400">도시와 주변 불가사의에서 문화를 수확합니다.</p>
                </div>
                <button 
                  onClick={handleHarvestCulture} 
                  disabled={selectedCity.hasHarvestedCulture || selectedCity.hasActedThisTurn} 
                  className={clsx('px-4 py-2 rounded-lg text-sm font-bold', (selectedCity.hasHarvestedCulture || selectedCity.hasActedThisTurn) ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white')}
                >
                  +{selectedCityCulture} 획득
                </button>
            </div>
          )}

          {/* [복구] 건설된 건물 & 불가사의 목록 */}
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <h4 className="text-lg font-medium text-white mb-3">건설된 건물 & 불가사의</h4>
            {selectedCity.buildings.length === 0 && (!selectedCity.builtWonders || selectedCity.builtWonders.length === 0) ? (
              <p className="text-slate-400">건설된 건물이나 불가사의가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {selectedCity.buildings.map((building) => {
                  const def = BUILDINGS[building.type];
                  return (
                    <div key={building.id} className="p-2 bg-slate-700 rounded text-sm">
                      <div className="text-white font-medium">{def.name}</div>
                      <div className="text-slate-400 text-xs">{def.description}</div>
                    </div>
                  );
                })}
                {/* 맵에서 찾은 주변 불가사의 표시 */}
                {(() => {
                   const wondersInCity: WonderType[] = [];
                   if (map) {
                     const cx = selectedCity.position.x;
                     const cy = selectedCity.position.y;
                     for (let dy = -1; dy <= 1; dy++) {
                       for (let dx = -1; dx <= 1; dx++) {
                         const nx = cx + dx;
                         const ny = cy + dy;
                         if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
                           const t = map.tiles[ny][nx];
                           if (t.ownerId === currentPlayer.id && t.wonder) {
                               wondersInCity.push(t.wonder.type);
                           }
                         }
                       }
                     }
                   }
                   return wondersInCity.map((wType, idx) => {
                     const wDef = WONDERS[wType];
                     return (
                        <div key={`wonder-${idx}`} className="p-2 bg-indigo-900/40 border border-indigo-700/50 rounded text-sm">
                          <div className="text-indigo-300 font-bold flex items-center gap-1">🗽 {wDef.name}</div>
                          <div className="text-slate-400 text-xs">{wDef.description}</div>
                        </div>
                     )
                   });
                })()}
              </div>
            )}
          </div>

          {/* 생산 패널 */}
          <div className="bg-slate-800 rounded-lg p-4">

            {/* 마비 상태 경고창! */}
            {selectedCity?.isParalyzed && (
              <div className="mb-4 p-3 bg-red-900/80 border-2 border-red-500 rounded-lg animate-pulse shadow-lg">
                <p className="text-white text-sm font-bold flex items-center gap-2">
                  <span className="text-xl">⛓️</span> 상대 스파이에 의해 도시가 마비되었습니다! (행동 불가)
                </p>
              </div>
            )}

            {/* 행동 불가 경고 메시지 */}
            {!canManageCity && (
              <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ 도시 경영 단계에서만 건설 및 생산이 가능합니다.
                </p>
              </div>
            )}
            {canManageCity && selectedCity?.hasActedThisTurn && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ 이 도시는 이번 턴에 이미 행동했습니다. (1턴에 도시당 1회 행동)
                </p>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <button onClick={() => setProductionTab('buildings')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'buildings' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>건물</button>
              <button onClick={() => setProductionTab('units')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'units' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>유닛</button>
              <button onClick={() => setProductionTab('armyCards')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'armyCards' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>부대 카드</button>
              <button onClick={() => setProductionTab('wonders')} className={clsx('px-4 py-2 rounded-lg text-sm font-bold', productionTab === 'wonders' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-indigo-300 hover:bg-slate-600')}>🗽 불가사의</button>
            </div>

            {productionTab === 'wonders' && (
              <div className="grid grid-cols-2 gap-2">
                {Object.values(WONDERS).map((wonder) => {
                  
                  // ==========================================
                  // 🌟 [추가] 화면에 그릴 때도 할인된 "실제 비용"을 계산합니다!
                  // ==========================================
                  let actualCost = wonder.cost;
                  if (wonder.costReductionTech && currentPlayer.technologies.some(t => t.id === wonder.costReductionTech)) {
                      actualCost = Math.max(1, actualCost - wonder.costReductionAmount!);
                  }

                  // 🌟 wonder.cost 대신 actualCost와 비교합니다.
                  const canAfford = selectedCityProduction >= actualCost; 
                  const cityActed = (selectedCity?.hasActedThisTurn || selectedCity?.isParalyzed) ?? false;
                  
                  return (
                    <motion.button 
                      key={wonder.type} 
                      whileHover={(canManageCity && canAfford && !cityActed) ? { scale: 1.02 } : {}} 
                      onClick={() => handleBuildWonder(wonder)} 
                      disabled={!canManageCity || !canAfford || cityActed} 
                      className={clsx('p-3 rounded-lg text-left transition-colors border border-indigo-900/50', (canManageCity && canAfford && !cityActed) ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-700 opacity-40 cursor-not-allowed')}
                    >
                      <div className="text-indigo-300 font-bold text-sm flex items-center gap-1">🗽 {wonder.name}</div>
                      <div className="text-slate-400 text-xs mt-1">{wonder.description}</div>
                      <div className="text-xs mt-1 text-purple-300">턴당 문화 +{wonder.cultureProduction}</div>
                      
                      {/* 🌟 화면에 보여주는 텍스트도 actualCost로 변경! */}
                      <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>
                        비용: {actualCost} {canAfford ? "" : "(부족)"}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {productionTab === 'buildings' && (
              <div className="grid grid-cols-2 gap-2">
                {availableBuildings.map((building) => {
                  const canAfford = selectedCityProduction >= building.productionCost;
                  const cityActed = (selectedCity?.hasActedThisTurn || selectedCity?.isParalyzed) ?? false;
                  return (
                    <motion.button key={building.type} whileHover={(canManageCity && canAfford && !cityActed) ? { scale: 1.02 } : {}} onClick={() => handleBuild(building)} disabled={!canManageCity || !canAfford || cityActed} className={clsx('p-3 rounded-lg text-left transition-colors', (canManageCity && canAfford && !cityActed) ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-700 opacity-40 cursor-not-allowed')}>
                      <div className="text-white font-medium text-sm">{building.name}</div>
                      <div className="text-slate-400 text-xs mt-1">{building.description}</div>
                      <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>비용: {building.productionCost} {canAfford ? "" : "(부족)"}</div>
                    </motion.button>
                  );
                })}
                {availableBuildings.length === 0 && (
                  <p className="text-slate-400 col-span-2">건설 가능한 건물이 없습니다.</p>
                )}
              </div>
            )}

            {productionTab === 'units' && (
              <div className="grid grid-cols-2 gap-2">
                {(['military', 'settler'] as UnitType[]).map((unitType) => {
                  const def = UNIT_DEFINITIONS[unitType];
                  const currentCount = unitType === 'military' ? militaryCount : settlerCount;
                  const isMaxed = currentCount >= (unitType === 'military' ? 6 : 2);
                  const canAfford = selectedCityProduction >= def.productionCost;
                  const cityActed = (selectedCity?.hasActedThisTurn || selectedCity?.isParalyzed) ?? false;
                  const isDisabled = isMaxed || !canManageCity || !canAfford || cityActed;
                  return (
                    <button key={unitType} onClick={() => handleProduceUnit(unitType)} disabled={isDisabled} className={clsx('p-3 rounded-lg text-left transition-colors', isDisabled ? 'bg-slate-700 opacity-40 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600')}>
                      <div className="text-white font-medium text-sm flex items-center gap-2"><span>{unitType === 'military' ? '⚔️' : '👷'}</span> {def.name}</div>
                      <div className="text-slate-400 text-xs mt-1">{def.description}</div>
                      <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>비용: {def.productionCost}</div>
                      <div className="text-slate-400 text-xs mt-1">보유: {currentCount}/{(unitType === 'military' ? 6 : 2)}</div>
                      {isMaxed && <div className="text-red-400 text-xs mt-1">최대치 도달</div>}
                    </button>
                  );
                })}
              </div>
            )}
            
            {productionTab === 'armyCards' && (
               <div className="grid grid-cols-2 gap-2">
                 {availableArmyCards.map((card) => {
                   const canAfford = selectedCityProduction >= card.productionCost;
                   const cityActed = (selectedCity?.hasActedThisTurn || selectedCity?.isParalyzed) ?? false;
                   const isDisabled = !canManageCity || !canAfford || cityActed;
                   const cardIcon = { infantry: '🗡️', artillery: '💣', cavalry: '🐴', airforce: '✈️', settler: '' }[card.type];
                   return (
                     <button key={`${card.type}-${card.tier}`} onClick={() => !isDisabled && setSelectedArmyTemplate(card)} disabled={isDisabled} className={clsx('p-3 rounded-lg text-left', isDisabled ? 'bg-slate-700 opacity-40 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600')}>
                       <div className="text-white font-medium text-sm flex items-center gap-2"><span>{cardIcon}</span> {card.name}</div>
                       <div className="text-slate-400 text-xs mt-1">Tier {card.tier} | 전투력: {card.totalCombatPower}</div>
                       <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>비용: {card.productionCost}</div>
                     </button>
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