// src/components/game/City/CityPanel.tsx

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../store/gameStore';
import { City, UnitType, UNIT_DEFINITIONS, Position, TERRAIN_PROPERTIES, BuildingDefinition, TerrainType, Player } from '../../../types';
import { BUILDINGS, getAvailableBuildings } from '../../../constants/buildings';
import { getAvailableArmyCards } from '../../../constants/armyCards';
import { calculateDetailedCityProduction, calculateCityCulture } from '../../../engine/ResourceCalculator';
import clsx from 'clsx';
import { ResourceType } from '../../../types/map';
import { getNextStepCost, CULTURE_TRACK_MAX } from '../../../constants/culture';
import { CultureTrackModal } from '../CultureTrackModal';
import { WONDERS, WonderType, WonderDefinition } from '../../../types/wonder'; 
import { getPlayerPassives } from '../../../store/helpers/playerHelpers';

type ProductionTab = 'buildings' | 'units' | 'armyCards' | 'wonders';

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

interface LocationModalProps {
  name: string;
  city: City;
  currentPlayer: Player;
  onSelect: (position: Position) => void;
  onClose: () => void;
  mode: 'building' | 'wonder' | 'unit';
}

function LocationModal({ name, city, currentPlayer, onSelect, onClose, mode }: LocationModalProps) {
  const { map } = useGameStore();
  const stackingLimit = 2 + getPlayerPassives(currentPlayer).stackingLimitBonus;

  const getAdjacentTiles = () => {
    if (!map) return []; 
    const tiles: { position: Position; isValid: boolean; terrain: string; hasBuilding: boolean; hasWonder: boolean; myUnitsCount: number }[] = [];
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
        const myUnitsCount = tile.unitIds.filter(id => currentPlayer.units.some(u => u.id === id)).length;
        
        let isValid = false;

        if (mode === 'unit') {
            isValid = tile.terrain !== 'water' && tile.terrain !== 'mountain' && myUnitsCount < stackingLimit && tile.isExplored;
        } else if (mode === 'wonder') {
            // 불가사의: 수도(isCenter) 불가. 건물/불가사의 여부 따지지 않음 (덮어쓰기 허용)
            isValid = !isCenter && tile.terrain !== 'water' && tile.terrain !== 'mountain' && tile.ownerId === city.ownerId && tile.isExplored;
        } else {
            // 일반 건물: 빈 땅 또는 수도 중앙
            isValid = !tile.buildingType && !tile.wonder && tile.terrain !== 'water' && tile.terrain !== 'mountain' && tile.ownerId === city.ownerId && tile.isExplored;
            if (mode === 'building' && isCenter) isValid = true;
        }

        tiles.push({
          position: { x, y },
          isValid,
          terrain: tile.terrain,
          hasBuilding: !!tile.buildingType || (isCenter && city.buildings.length > 0),
          hasWonder: !!tile.wonder,
          myUnitsCount
        });
      }
    }
    return tiles;
  };

  const adjacentTiles = getAdjacentTiles();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-lg font-semibold mb-2">{name} {mode === 'unit' ? '배치' : '건설'} 위치 선택</h3>
        <p className="text-slate-400 text-sm mb-4">도시 주변 타일 중 {mode === 'unit' ? '유닛을 배치' : '건설'}할 위치를 선택하세요</p>

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
                {tile.hasBuilding && !isCenter && mode !== 'unit' && <span className="text-lg z-10">🏗️</span>}
                {tile.hasWonder && mode !== 'unit' && <span className="text-lg z-10">🗽</span>}
                
                {mode === 'unit' && tile.myUnitsCount > 0 && (
                    <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-full z-20 shadow-md border border-red-800">
                        {tile.myUnitsCount}/{stackingLimit}
                    </div>
                )}
                
                <span className="text-[10px] text-white/80 z-10 mt-1">
                  {TERRAIN_PROPERTIES[tile.terrain as TerrainType]?.name || tile.terrain}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 mb-4 text-center">
          {mode === 'unit' ? (
              <p>배치 한도(Stacking Limit): 타일당 {stackingLimit}개</p>
          ) : (
              <p>🏛️ = 도시 중앙 | 🏗️ = 지어진 건물 | 🗽 = 불가사의</p>
          )}
          <p>어두운 타일 = {mode === 'unit' ? '배치 불가 (물/산/한도 초과/미탐험)' : '건설 불가 (물/산/소유권 없음/미탐험)'}</p>
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
    players, currentPlayerIndex, currentPhase, 
    buildInCity, createUnit, produceArmyCard, 
    harvestCityCulture, harvestResource, constructWonder,
    map, advanceCultureTrack,
  } = useGameStore();
  
  const currentPlayer = players[currentPlayerIndex];
  
  const [selectedCityId, setSelectedCityId] = useState<string | null>(initialCity?.id || currentPlayer.cities[0]?.id || null);
  const selectedCity = currentPlayer.cities.find(c => c.id === selectedCityId) || null;
  
  const [productionTab, setProductionTab] = useState<ProductionTab>('buildings');
  const [selectedBuildingToBuild, setSelectedBuildingToBuild] = useState<{ def: BuildingDefinition; isFree: boolean } | null>(null);
  const [selectedWonderToBuild, setSelectedWonderToBuild] = useState<WonderDefinition | null>(null);
  const [selectedUnitToProduce, setSelectedUnitToProduce] = useState<UnitType | null>(null);
  const [showCultureModal, setShowCultureModal] = useState(false);
  const [tradeConvertAmount, setTradeConvertAmount] = useState<number>(0);

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

    if (selectedCity.pioneerLinkedLuxuries) {
      selectedCity.pioneerLinkedLuxuries.forEach(res => {
        if (res !== 'none') resources.add(res);
      });
    }

    return Array.from(resources);
  }, [selectedCity, map]);

  const researchedTechIds = currentPlayer.technologies.map((t) => t.id);
  const existingBuildingTypes = selectedCity?.buildings.map(b => b.type) || [];
  const availableBuildings = getAvailableBuildings(researchedTechIds, existingBuildingTypes).filter(b => !b.isWonder);
  const availableArmyCards = getAvailableArmyCards(researchedTechIds);

  const militaryCount = currentPlayer.units.filter((u) => u.type === 'military').length;
  const settlerCount = currentPlayer.units.filter((u) => u.type === 'settler').length;

  const hasEngineering = currentPlayer.technologies.some(t => t.id === 'engineering');
  const currentProduced = selectedCity?.producedItemsCount || 0;
  const actionType = selectedCity?.actionTypeThisTurn || 'none';

  const productionDetails = (selectedCity && map && currentPlayer) 
      ? calculateDetailedCityProduction(selectedCity, map, currentPlayer, players) 
      : { total: 0, base: 0, buildings: 0, militaryScience: 0, tempBonus: 0 };

  const totalCityProduction = productionDetails.total;
  const availableProduction = totalCityProduction - (selectedCity?.usedProductionThisTurn || 0);
  
  // 🌟 [핵심] 무정부 상태 마비 완벽 차단
  const isAnarchyCapital = currentPlayer.government === 'anarchy' && selectedCity?.isCapital;
  const isCityParalyzed = selectedCity?.isParalyzed || isAnarchyCapital;

  const cannotProduce = 
      isCityParalyzed || 
      actionType === 'harvest' || 
      currentProduced >= 2 || 
      (currentProduced === 1 && (!hasEngineering || currentPlayer.hasUsedEngineeringThisTurn));

  const cannotHarvest = isCityParalyzed || selectedCity?.hasActedThisTurn || currentProduced > 0 || actionType === 'produce';

  let selectedCityCulture = 0;
  if (selectedCity && map) {
      selectedCityCulture = calculateCityCulture(selectedCity, map, players) + 1;
      if (selectedCity.isCapital) {
          if (currentPlayer.government === 'monarchy') selectedCityCulture += 1;
          else if (currentPlayer.government === 'communism') selectedCityCulture -= 1;
      }
  }

  const nextCultureCost = getNextStepCost(currentPlayer.cultureTrack);
  const canAdvanceCulture = 
    currentPlayer.resources.culture >= nextCultureCost.culture && 
    currentPlayer.resources.trade >= nextCultureCost.trade &&
    currentPlayer.cultureTrack < CULTURE_TRACK_MAX;

  const isAmerica = currentPlayer.nation === 'america';
  const prodPerClick = isAmerica ? 2 : 1;
  const tradeCostPerClick = 3;

  const handleConvertTrade = () => {
    if (tradeConvertAmount > 0 && selectedCity) {
      const times = tradeConvertAmount / prodPerClick;
      const cost = times * tradeCostPerClick;

      // 🌟 [수정] GameStore 타입 에러를 우회하고 직접 상태를 업데이트합니다!
      useGameStore.setState((state) => {
        const p = state.players.find(pl => pl.id === currentPlayer.id);
        const c = p?.cities.find(ci => ci.id === selectedCity.id);
        
        if (p && c && p.resources.trade >= cost) {
          p.resources.trade -= cost;
          c.tempProductionBonus = (c.tempProductionBonus || 0) + tradeConvertAmount;

        }
      });

      setTradeConvertAmount(0);
    }
  };

  const handleBuild = (building: BuildingDefinition, useFreeBuild: boolean = false) => {
    if (!canManageCity || cannotProduce) return;
    if (!useFreeBuild && availableProduction < building.productionCost) {
      alert(`잔여 생산력이 부족합니다.`);
      return;
    }
    setSelectedBuildingToBuild({ def: building, isFree: useFreeBuild } as any);
  };

  const handleBuildWonder = (wonder: WonderDefinition) => {
    if (!canManageCity || cannotProduce) return;
    let actualCost = wonder.cost;
    if (wonder.costReductionTech && currentPlayer.technologies.some(t => t.id === wonder.costReductionTech)) {
        actualCost = Math.max(1, actualCost - wonder.costReductionAmount!);
    }
    if (availableProduction < actualCost) {
      alert(`잔여 생산력이 부족합니다. (현재: ${availableProduction}, 필요: ${actualCost})`);
      return;
    }
    setSelectedWonderToBuild(wonder);
  };

  const handleBuildAtLocation = (position: Position) => {
    if (selectedCity && selectedBuildingToBuild) {
      buildInCity(selectedCity.id, selectedBuildingToBuild.def.type, position);
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
    if (!canManageCity || !selectedCity || cannotProduce) return;
    const def = UNIT_DEFINITIONS[type];
    if (availableProduction < def.productionCost) return alert('잔여 생산력이 부족합니다.');
    if (type === 'military' && militaryCount >= 6) return alert('군사 유닛 한도 도달.');
    if (type === 'settler' && settlerCount >= 2) return alert('개척자 한도 도달.');
    setSelectedUnitToProduce(type);
  };

  const handleUnitAtLocation = (position: Position) => {
    if (selectedCity && selectedUnitToProduce) {
        createUnit(currentPlayer.id, selectedUnitToProduce, position, selectedCity.id);
        setSelectedUnitToProduce(null);
    }
  };

  const handleProduceArmyCard = (type: string, tier: number, name: string, cost: number) => {
    if (!selectedCity || !canManageCity || cannotProduce) return;
    if (availableProduction < cost) return alert('잔여 생산력이 부족합니다.');
    produceArmyCard(currentPlayer.id, type, tier, name, selectedCity.id, cost);
  };

  const handleHarvestCulture = () => {
    if (!canManageCity || !selectedCity || cannotHarvest) return;
    harvestCityCulture(currentPlayer.id, selectedCity.id);
  };

  const handleHarvestResource = (resource: ResourceType) => {
    if (!canManageCity || !selectedCity || cannotHarvest || !isOwner) return;
    harvestResource(currentPlayer.id, selectedCity.id, resource);
  };

  if (currentPlayer.cities.length === 0) return <div className="text-center text-slate-400 py-8">도시가 없습니다.</div>;

  let actionStatusText = '가능';
  let actionStatusColor = 'text-green-400';
  if (isAnarchyCapital) {
     actionStatusText = '🔥 무정부 폭동 (수도 기능 마비)';
     actionStatusColor = 'text-red-500 font-bold animate-pulse';
  } else if (selectedCity?.isParalyzed) {
     actionStatusText = '마비됨 (행동 불가)';
     actionStatusColor = 'text-red-400';
  } else if (actionType === 'harvest') {
     actionStatusText = '수확 완료 (생산 불가)';
     actionStatusColor = 'text-red-400';
  } else if (currentProduced >= 2 || (currentProduced === 1 && (!hasEngineering || currentPlayer.hasUsedEngineeringThisTurn))) {
     actionStatusText = '생산 완료 (행동 불가)';
     actionStatusColor = 'text-red-400';
  } else if (currentProduced === 1) {
     actionStatusText = '1회 생산 완료 (공학 가능)';
     actionStatusColor = 'text-amber-400';
  }

  return (
    <div className="flex gap-6">
      
      {selectedBuildingToBuild && selectedCity && (
        <LocationModal name={selectedBuildingToBuild.def.name} city={selectedCity} currentPlayer={currentPlayer} mode="building" onSelect={handleBuildAtLocation} onClose={() => setSelectedBuildingToBuild(null)} />
      )}
      {selectedWonderToBuild && selectedCity && (
        <LocationModal name={selectedWonderToBuild.name} city={selectedCity} currentPlayer={currentPlayer} mode="wonder" onSelect={handleWonderAtLocation} onClose={() => setSelectedWonderToBuild(null)} />
      )}
      {selectedUnitToProduce && selectedCity && (
        <LocationModal name={UNIT_DEFINITIONS[selectedUnitToProduce].name} city={selectedCity} currentPlayer={currentPlayer} mode="unit" onSelect={handleUnitAtLocation} onClose={() => setSelectedUnitToProduce(null)} />
      )}
      
      {showCultureModal && <CultureTrackModal onClose={() => setShowCultureModal(false)} />}
      
      <div className="w-64 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">내 도시</h3>
        {currentPlayer.cities.map((city) => (
          <button
            key={city.id}
            onClick={() => setSelectedCityId(city.id)}
            className={clsx('w-full p-3 rounded-lg text-left transition-colors', selectedCity?.id === city.id ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}
          >
            <div className="font-medium flex items-center gap-2">{city.isCapital && <span>👑</span>} {city.name}</div>
            <div className="text-sm opacity-75 mt-1">생산력: {map ? calculateDetailedCityProduction(city, map, currentPlayer).total : 0} | 건물: {city.buildings.length}</div>
          </button>
        ))}
      </div>

      {selectedCity && (
        <div className="flex-1 max-h-[80vh] overflow-y-auto pr-2">
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-white mb-2">{selectedCity.isCapital && '👑 '}{selectedCity.name}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-slate-300 relative group cursor-help w-max">
                  <span className="text-orange-400">잔여 생산력: </span> 
                  <span className="font-bold text-lg text-white">{availableProduction}</span> 
                  <span className="text-slate-500 text-xs"> / {totalCityProduction}</span>
                  <div className="absolute left-0 top-full mt-2 w-48 bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-slate-300 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="font-bold text-orange-400 mb-1 border-b border-slate-700 pb-1">총 생산력 내역</div>
                      <div className="flex justify-between py-0.5"><span>기본(지형):</span> <span>+{productionDetails.base}</span></div>
                      {productionDetails.buildings > 0 && <div className="flex justify-between py-0.5"><span>건물 보너스:</span> <span>+{productionDetails.buildings}</span></div>}
                      {productionDetails.tempBonus > 0 && <div className="flex justify-between py-0.5 text-amber-400"><span>임시 보너스:</span> <span>+{productionDetails.tempBonus}</span></div>}
                      {productionDetails.militaryScience > 0 && <div className="flex justify-between py-0.5 text-red-400 font-bold"><span>군사학 (화폐):</span> <span>+{productionDetails.militaryScience}</span></div>}
                  </div>
              </div>
              <div className="text-slate-300"><span className="text-red-400">방어 보너스:</span> +{selectedCity.cityDefenseBonus}</div>
              <div className="text-slate-300"><span className="text-blue-400">성벽:</span> {selectedCity.hasWalls ? '있음' : '없음'}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center text-sm">
                <span className="text-slate-400">이번 턴 행동:</span>
                <span className={clsx('font-bold', actionStatusColor)}>{actionStatusText}</span>
            </div>
          </div>

          {canManageCity && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-purple-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl">🎭</div>
              <div className="flex justify-between items-center mb-3 relative z-10">
                <h4 className="text-lg font-bold text-purple-400 flex items-center gap-2"><span>🎭</span> 문명 문화 증진</h4>
                <button onClick={() => setShowCultureModal(true)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300">전체 트랙 보기</button>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg relative z-10">
                <div>
                  <div className="text-sm text-white mb-1">현재 트랙: <span className="font-bold text-purple-400 text-lg">{currentPlayer.cultureTrack}</span> / {CULTURE_TRACK_MAX}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>다음 단계 비용:</span>
                    <span className={clsx("font-bold flex items-center gap-1", currentPlayer.resources.culture >= nextCultureCost.culture ? "text-purple-300" : "text-red-400")}>🎭 {nextCultureCost.culture}</span>
                    <span className={clsx("font-bold flex items-center gap-1", currentPlayer.resources.trade >= nextCultureCost.trade ? "text-amber-300" : "text-red-400")}>📦 {nextCultureCost.trade}</span>
                  </div>
                </div>
                <button onClick={advanceCultureTrack} disabled={!canAdvanceCulture} className={clsx("px-5 py-2 rounded-lg text-sm font-bold shadow-lg", canAdvanceCulture ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transform hover:scale-105" : "bg-slate-700 text-slate-500 cursor-not-allowed")}>문화 증진</button>
              </div>
            </div>
          )}

          {availableResources.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-amber-700/50">
                <h4 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2"><span>🌾</span> 사치품 수확 (주변 8칸&보급)</h4>
                <div className="flex flex-wrap gap-2">
                    {availableResources.map((resource) => (
                        <button key={resource} onClick={() => handleHarvestResource(resource)} disabled={!isOwner || cannotHarvest || !canManageCity} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border', (!isOwner || cannotHarvest || !canManageCity) ? 'bg-slate-700 border-slate-600 opacity-50' : 'bg-slate-700 border-amber-600 hover:bg-amber-900 text-white')}>
                            <span className="text-lg">{RESOURCE_ICONS[resource]}</span><span>{RESOURCE_NAMES[resource]} (+1)</span>
                        </button>
                    ))}
                </div>
            </div>
          )}

          {canManageCity && selectedCityCulture > 0 && (
            <div className="bg-slate-800 rounded-lg p-4 mb-4 flex justify-between items-center border border-purple-900/30">
                <div>
                  <h4 className="text-md font-bold text-purple-300">📜 문화 생산</h4>
                  <p className="text-xs text-slate-400">도시와 주변 불가사의에서 문화를 수확합니다.</p>
                </div>
                <button onClick={handleHarvestCulture} disabled={selectedCity.hasHarvestedCulture || cannotHarvest} className={clsx('px-4 py-2 rounded-lg text-sm font-bold', (selectedCity.hasHarvestedCulture || cannotHarvest) ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white')}>+{selectedCityCulture} 획득</button>
            </div>
          )}

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
                           if (t.ownerId === currentPlayer.id && t.wonder) wondersInCity.push(t.wonder.type);
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

          <div className="bg-slate-800 rounded-lg p-4">
            {isCityParalyzed && (
              <div className="mb-4 p-3 bg-red-900/80 border-2 border-red-500 rounded-lg animate-pulse shadow-lg">
                <p className="text-white text-sm font-bold flex items-center gap-2">
                  {isAnarchyCapital ? <><span className="text-xl">🔥</span> 무정부 폭동으로 인해 수도 기능이 마비되었습니다! (행동 불가)</> : <><span className="text-xl">⛓️</span> 상대 스파이에 의해 도시가 마비되었습니다! (행동 불가)</>}
                </p>
              </div>
            )}

            {!canManageCity && <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg"><p className="text-yellow-400 text-sm">⚠️ 도시 경영 단계에서만 건설 및 생산이 가능합니다.</p></div>}
            {canManageCity && actionType === 'harvest' && <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg"><p className="text-red-400 text-sm">⚠️ 이번 턴에 수확 행동을 마쳐서 더 이상 생산할 수 없습니다.</p></div>}
            {canManageCity && cannotProduce && actionType !== 'harvest' && !isCityParalyzed && <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg"><p className="text-red-400 text-sm">⚠️ 생산 한도 도달: {currentProduced >= 2 ? '공학 능력(최대 2회)을 모두 소모했습니다.' : '다른 도시에서 이미 공학 능력을 사용했거나, 공학 기술이 없습니다.'}</p></div>}

            {canManageCity && !cannotProduce && !isCityParalyzed && (
               <div className="mb-4 p-3 bg-slate-750 border border-amber-600/50 rounded-lg">
                 <div className="flex justify-between items-center mb-2">
                   <h4 className="text-sm font-bold text-amber-400">🔄 교역품 긴급 조달</h4>
                   <span className="text-xs text-slate-400">(비율 - 교역 3 : 생산 {isAmerica ? '2 (🇺🇸 미국 특성)' : '1'})</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="flex-1 flex items-center bg-slate-900 rounded p-1">
                     <button onClick={() => setTradeConvertAmount(Math.max(0, tradeConvertAmount - prodPerClick))} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded">-</button>
                     <span className="flex-1 text-center text-white font-bold">+{tradeConvertAmount} 생산</span>
                     <button onClick={() => setTradeConvertAmount(tradeConvertAmount + prodPerClick)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded">+</button>
                   </div>
                   <button onClick={handleConvertTrade} disabled={tradeConvertAmount === 0 || currentPlayer.resources.trade < (tradeConvertAmount / prodPerClick) * tradeCostPerClick} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white font-bold rounded text-sm transition-colors">
                     교역 {tradeConvertAmount === 0 ? 0 : (tradeConvertAmount / prodPerClick) * tradeCostPerClick} 소모
                   </button>
                 </div>
               </div>
            )}

            <div className="flex gap-2 mb-4 mt-4">
              <button onClick={() => setProductionTab('buildings')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'buildings' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>건물</button>
              <button onClick={() => setProductionTab('units')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'units' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>유닛</button>
              <button onClick={() => setProductionTab('armyCards')} className={clsx('px-4 py-2 rounded-lg text-sm', productionTab === 'armyCards' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')}>부대 카드</button>
              <button onClick={() => setProductionTab('wonders')} className={clsx('px-4 py-2 rounded-lg text-sm font-bold', productionTab === 'wonders' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-indigo-300 hover:bg-slate-600')}>🗽 불가사의</button>
            </div>

            {productionTab === 'wonders' && (
              <div className="grid grid-cols-2 gap-2">
                {Object.values(WONDERS).map((wonder) => {
                  let actualCost = wonder.cost;
                  if (wonder.costReductionTech && currentPlayer.technologies.some(t => t.id === wonder.costReductionTech)) actualCost = Math.max(1, actualCost - wonder.costReductionAmount!);

                  const canAfford = availableProduction >= actualCost; 
                  const cityActed = cannotProduce || isCityParalyzed;
                  
                  let isAlreadyBuilt = false;
                  for (const p of players) {
                      if (p.builtWonders?.includes(wonder.type)) {
                          isAlreadyBuilt = true;
                          break;
                      }
                  }
                  
                  const isDisabled = !canManageCity || !canAfford || cityActed || isAlreadyBuilt;
                  
                  return (
                    <motion.button key={wonder.type} whileHover={!isDisabled ? { scale: 1.02 } : {}} onClick={() => handleBuildWonder(wonder)} disabled={isDisabled} className={clsx('p-3 rounded-lg text-left transition-colors border border-indigo-900/50 relative overflow-hidden', !isDisabled ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-700 opacity-40 cursor-not-allowed')}>
                      <div className="text-indigo-300 font-bold text-sm flex items-center justify-between gap-1">
                          <span>🗽 {wonder.name}</span>
                          {isAlreadyBuilt && <span className="text-[10px] text-red-200 bg-red-900/80 px-1.5 py-0.5 rounded border border-red-500">역사 속으로</span>}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">{wonder.description}</div>
                      <div className="text-xs mt-1 text-purple-300">턴당 문화 +{wonder.cultureProduction}</div>
                      <div className={clsx("text-xs mt-1 font-bold", isAlreadyBuilt ? "text-slate-500" : canAfford ? "text-amber-400" : "text-red-400")}>비용: {actualCost} {isAlreadyBuilt ? "" : canAfford ? "" : "(부족)"}</div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {productionTab === 'buildings' && (
              <div className="grid grid-cols-2 gap-2">
                {availableBuildings.map((building) => {
                  const canAfford = availableProduction >= building.productionCost;
                  const canUseEgyptFreeBuild = currentPlayer.nation === 'egypt' && !currentPlayer.hasUsedEgyptFreeBuildingThisTurn;
                  const cityActed = cannotProduce || isCityParalyzed;
                  return (
                    <div key={building.type} className={clsx('p-3 rounded-lg text-left transition-colors flex flex-col justify-between', (canManageCity && (canAfford || canUseEgyptFreeBuild) && !cityActed) ? 'bg-slate-700' : 'bg-slate-700 opacity-40')}>
                      <div>
                          <div className="text-white font-medium text-sm">{building.name}</div>
                          <div className="text-slate-400 text-xs mt-1">{building.description}</div>
                          <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>비용: {building.productionCost} {canAfford ? "" : "(부족)"}</div>
                      </div>
                      <div className="mt-3 flex gap-1">
                          <button onClick={() => handleBuild(building, false)} disabled={!canManageCity || !canAfford || cityActed} className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white text-xs font-bold rounded">건설</button>
                          {currentPlayer.nation === 'egypt' && <button onClick={() => handleBuild(building, true)} disabled={!canManageCity || !canUseEgyptFreeBuild || cityActed} className="flex-1 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-600 text-black text-xs font-bold rounded">🏺 무료 건설</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {productionTab === 'units' && (
              <div className="grid grid-cols-2 gap-2">
                {(['military', 'settler'] as UnitType[]).map((unitType) => {
                  const def = UNIT_DEFINITIONS[unitType];
                  const currentCount = unitType === 'military' ? militaryCount : settlerCount;
                  const isMaxed = currentCount >= (unitType === 'military' ? 6 : 2);
                  const canAfford = availableProduction >= def.productionCost;
                  const cityActed = cannotProduce || isCityParalyzed;
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
                  const canAfford = availableProduction >= card.productionCost;
                  const cityActed = cannotProduce || isCityParalyzed;
                  const isDisabled = !canManageCity || !canAfford || cityActed;
                  const cardIcon = ({ infantry: '🗡️', artillery: '💣', cavalry: '🐴', airforce: '✈️', settler: '' } as Record<string, string>)[card.type] || '🗡️';

                  return (
                    <div key={`${card.type}-${card.tier}`} className={clsx('p-3 rounded-lg text-left flex flex-col justify-between', isDisabled ? 'bg-slate-700 opacity-40' : 'bg-slate-700')}>
                      <div>
                          <div className="text-white font-medium text-sm flex items-center gap-2"><span>{cardIcon}</span> {card.name}</div>
                          <div className="text-slate-400 text-xs mt-1">티어 {card.tier} 부대</div>
                          <div className={clsx("text-xs mt-1 font-bold", canAfford ? "text-amber-400" : "text-red-400")}>비용: {card.productionCost} {canAfford ? "" : "(부족)"}</div>
                          <div className="text-slate-400 text-[10px] mt-1 flex items-center gap-1"><span>🎲</span> 능력치(방어/공수/공격) 랜덤 부여</div>
                      </div>
                      <div className="mt-3">
                          <button onClick={() => handleProduceArmyCard(card.type, card.tier, card.name, card.productionCost)} disabled={isDisabled} className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white text-xs font-bold rounded transition-colors">부대 징집</button>
                      </div>
                    </div>
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