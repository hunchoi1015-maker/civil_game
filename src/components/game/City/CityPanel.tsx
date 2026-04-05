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

const WONDER_ICONS: Record<string, string> = {
  pyramids: '🔺',
  colossus: '🗿',
  hanging_gardens: '⛲',
  stonehenge: '🪨',
  oracle: '🏛️',
  louvre: '🖼️',
  himeji_castle: '🏯',
  porcelain_tower: '🏺',
  angkor_wat: '🛕',
  un: '🌐',
  statue_of_liberty: '🗽',
  sydney_opera_house: '🎭',
  panama_canal: '🚢',
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
  buildingDef?: BuildingDefinition; 
}

function LocationModal({ name, city, currentPlayer, onSelect, onClose, mode, buildingDef }: LocationModalProps) {
  const { map } = useGameStore();
  const stackingLimit = 2 + getPlayerPassives(currentPlayer).stackingLimitBonus;

  const getAdjacentTiles = () => {
    if (!map) return []; 
    const tiles: { position: Position; isValid: boolean; isReplacement: boolean; terrain: string; hasBuilding: boolean; hasWonder: boolean; wonderType?: string; myUnitsCount: number }[] = [];
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
        let isReplacement = false; // 🌟 덮어쓰기 여부 파악

        if (mode === 'unit') {
            isValid = tile.terrain !== 'water' && tile.terrain !== 'mountain' && myUnitsCount < stackingLimit && tile.isExplored;
        } else if (mode === 'wonder') {
            isValid = !isCenter && tile.terrain !== 'water' && tile.ownerId === city.ownerId && tile.isExplored;
        } else {
            // 🌟 [추가] 일반 건물 vs 특성화 건물 덮어쓰기 로직 분기
            const existingSpecialty = city.buildings.find(b => BUILDINGS[b.type].isSpecialty);
            
            if (buildingDef?.isSpecialty && existingSpecialty) {
                // 특성화 건물 교체 모드
                isValid = tile.position.x === existingSpecialty.tilePosition?.x && tile.position.y === existingSpecialty.tilePosition?.y;
                isReplacement = isValid;
            } else {
                // 일반 건물 건설 모드
                isValid = !tile.buildingType && !tile.wonder && tile.ownerId === city.ownerId && tile.isExplored;
                if (isCenter && !tile.wonder) isValid = true;
            }
        }

        tiles.push({
          position: { x, y },
          isValid,
          isReplacement,
          terrain: tile.terrain,
          hasBuilding: !!tile.buildingType || (isCenter && city.buildings.length > 0),
          hasWonder: !!tile.wonder,
          wonderType: tile.wonder?.type,
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
                  tile.isValid 
                    ? (tile.isReplacement ? 'ring-4 ring-red-500 animate-pulse cursor-pointer' : 'hover:ring-2 hover:ring-amber-400 cursor-pointer') 
                    : 'opacity-40 cursor-not-allowed',
                  isCenter && 'ring-2 ring-white'
                )}
              >
                {isCenter && <span className="text-lg z-10">🏛️</span>}
                {tile.hasBuilding && !isCenter && mode !== 'unit' && <span className="text-lg z-10">🏗️</span>}
                {tile.hasWonder && mode !== 'unit' && <span className="text-lg z-10">{WONDER_ICONS[tile.wonderType!] || '🏛️'}</span>}
                
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
              <p>빨간색 반짝이는 타일 = 철거 및 특성 교체 대상</p>
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
    map, advanceCultureTrack, addToast,
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
      addToast(`잔여 생산력이 부족합니다.`);
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
      addToast(`잔여 생산력이 부족합니다. (현재: ${availableProduction}, 필요: ${actualCost})`);
      return;
    }
    setSelectedWonderToBuild(wonder);
  };

  const handleBuildAtLocation = (position: Position) => {
    if (selectedCity && selectedBuildingToBuild) {
      // 마지막 매개변수로 selectedBuildingToBuild.isFree 플래그를 전달합니다!
      buildInCity(selectedCity.id, selectedBuildingToBuild.def.type, position, selectedBuildingToBuild.isFree);
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
    if (availableProduction < def.productionCost) return addToast('잔여 생산력이 부족합니다.');
    if (type === 'military' && militaryCount >= 6) return addToast('군사 유닛 한도 도달.');
    if (type === 'settler' && settlerCount >= 2) return addToast('개척자 한도 도달.');
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
    if (availableProduction < cost) return addToast('잔여 생산력이 부족합니다.');
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
    //  panel-texture 와 패널 높이 꽉 채우기 적용
    <div className="flex gap-6 h-full panel-texture p-4 rounded-lg">
      <div className="panel-content flex gap-6 w-full h-full">
      
      {selectedBuildingToBuild && selectedCity && (
        <LocationModal name={selectedBuildingToBuild.def.name} city={selectedCity} currentPlayer={currentPlayer} mode="building" buildingDef={selectedBuildingToBuild.def} onSelect={handleBuildAtLocation} onClose={() => setSelectedBuildingToBuild(null)} />
      )}
      {selectedWonderToBuild && selectedCity && (
        <LocationModal name={selectedWonderToBuild.name} city={selectedCity} currentPlayer={currentPlayer} mode="wonder" onSelect={handleWonderAtLocation} onClose={() => setSelectedWonderToBuild(null)} />
      )}
      {selectedUnitToProduce && selectedCity && (
        <LocationModal name={UNIT_DEFINITIONS[selectedUnitToProduce].name} city={selectedCity} currentPlayer={currentPlayer} mode="unit" onSelect={handleUnitAtLocation} onClose={() => setSelectedUnitToProduce(null)} />
      )}
      
      {showCultureModal && <CultureTrackModal onClose={() => setShowCultureModal(false)} />}
      
      <div className="w-64 space-y-2 border-r border-amber-700/30 pr-4">
        {/* 제목 폰트 세리프체 적용 */}
        <h3 className="text-xl font-serif font-bold text-amber-500 mb-3 border-b border-amber-700/30 pb-2">내 도시</h3>
        {currentPlayer.cities.map((city) => (
          <button
            key={city.id}
            onClick={() => setSelectedCityId(city.id)}
            className={clsx(
              'w-full p-3 rounded-md text-left transition-all border font-serif',
              selectedCity?.id === city.id 
                ? 'bg-amber-900/40 border-amber-500 text-amber-200 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)] text-glow-gold' 
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-amber-700/50 hover:text-amber-100'
            )}
          >
            <div className="font-bold text-lg flex items-center gap-2">{city.isCapital && <span>👑</span>} {city.name}</div>
            <div className="text-xs opacity-75 mt-1 font-sans">
              생산력: <span className="font-cinzel text-sm">{map ? calculateDetailedCityProduction(city, map, currentPlayer).total : 0}</span> | 
              건물: <span className="font-cinzel text-sm">{city.buildings.length}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedCity && (
        <div className="flex-1 max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar">
          <div className="bg-slate-900/60 border border-amber-700/30 rounded-lg p-5 mb-4 shadow-inner">
            {/*  폰트 세리프체, 텍스트 글로우, 줄바꿈 방지 적용 */}
            <h3 className="text-3xl font-serif font-black text-amber-400 text-glow-gold mb-4 pb-2 border-b border-amber-700/50">
              {selectedCity.isCapital && '👑 '}{selectedCity.name}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-slate-300 relative group cursor-help w-max bg-slate-950 px-3 py-1.5 rounded border border-slate-700 shadow-inner">
                  <span className="text-orange-400 font-serif mr-2 text-sm">잔여 생산력</span> 
                  {/*  Cinzel 폰트와 text-glow-gold 클래스 적용 */}
                  <span className="font-cinzel font-bold text-2xl text-amber-400 text-glow-gold">{availableProduction}</span> 
                  <span className="text-slate-500 text-xs font-cinzel ml-1">/ {totalCityProduction}</span>
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
            <div className="bg-slate-900/80 rounded-lg p-5 mb-4 border border-purple-900/50 relative overflow-hidden shadow-inner">
              <div className="absolute top-0 right-0 p-2 opacity-5 text-7xl pointer-events-none">🎭</div>
              <div className="flex justify-between items-center mb-3 relative z-10 border-b border-purple-900/50 pb-2">
                <h4 className="text-xl font-serif font-bold text-purple-400 text-shadow-[0_0_10px_rgba(192,132,252,0.4)] flex items-center gap-2"><span>🎭</span> 문명 문화 증진</h4>
                <button onClick={() => setShowCultureModal(true)} className="text-xs px-3 py-1 font-serif bg-slate-800 hover:bg-slate-700 border border-purple-900/50 rounded text-purple-200 transition-colors">전체 트랙 보기</button>
              </div>
              <div className="flex items-center justify-between bg-slate-950/50 p-4 rounded-lg border border-slate-800 relative z-10">
                <div>
                  <div className="text-sm text-purple-200/80 mb-1 font-serif">현재 트랙: <span className="font-cinzel font-bold text-purple-400 text-2xl text-shadow-[0_0_8px_rgba(192,132,252,0.6)] ml-1">{currentPlayer.cultureTrack}</span> <span className="font-cinzel text-slate-500">/ {CULTURE_TRACK_MAX}</span></div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-2 font-serif">
                    <span>다음 단계 비용:</span>
                    <span className={clsx("flex items-center gap-1", currentPlayer.resources.culture >= nextCultureCost.culture ? "text-purple-300" : "text-red-500")}>🎭 <span className="font-cinzel font-bold text-lg">{nextCultureCost.culture}</span></span>
                    <span className={clsx("flex items-center gap-1", currentPlayer.resources.trade >= nextCultureCost.trade ? "text-amber-300" : "text-red-500")}>📦 <span className="font-cinzel font-bold text-lg">{nextCultureCost.trade}</span></span>
                  </div>
                </div>
                <button onClick={advanceCultureTrack} disabled={!canAdvanceCulture} className={clsx("px-6 py-2.5 rounded-lg text-sm font-serif font-bold shadow-lg transition-all", canAdvanceCulture ? "bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-500/50 text-shadow-[0_0_5px_rgba(255,255,255,0.5)] transform hover:scale-105" : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed")}>문화 증진</button>
              </div>
            </div>
          )}

          {availableResources.length > 0 && (
            <div className="bg-slate-900/60 rounded-lg p-5 mb-4 border border-amber-700/40 shadow-inner">
                <h4 className="text-xl font-serif font-bold text-amber-400 text-glow-gold mb-3 flex items-center gap-2 border-b border-amber-700/30 pb-2"><span>🌾</span> 사치품 수확 <span className="text-xs text-amber-200/50 font-sans font-normal mt-1">(주변 8칸 & 보급)</span></h4>
                <div className="flex flex-wrap gap-2">
                    {availableResources.map((resource) => (
                        <button key={resource} onClick={() => handleHarvestResource(resource)} disabled={!isOwner || cannotHarvest || !canManageCity} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors', (!isOwner || cannotHarvest || !canManageCity) ? 'bg-slate-800 border-slate-700 opacity-50' : 'bg-slate-800 border-amber-700/50 hover:bg-amber-900/60 text-amber-50 hover:border-amber-500 shadow-sm')}>
                            <span className="text-xl">{RESOURCE_ICONS[resource]}</span><span className="font-serif">{RESOURCE_NAMES[resource]} <span className="font-cinzel text-amber-400">(+1)</span></span>
                        </button>
                    ))}
                </div>
            </div>
          )}

          {canManageCity && selectedCityCulture > 0 && (
            <div className="bg-slate-900/60 rounded-lg p-4 mb-4 flex justify-between items-center border border-purple-900/40 shadow-inner">
                <div>
                  <h4 className="text-lg font-serif font-bold text-purple-300 text-shadow-[0_0_8px_rgba(216,180,254,0.5)]">📜 문화 생산</h4>
                  <p className="text-xs text-purple-200/50 font-serif mt-1">도시와 주변 불가사의에서 문화를 수확합니다.</p>
                </div>
                <button onClick={handleHarvestCulture} disabled={selectedCity.hasHarvestedCulture || cannotHarvest} className={clsx('px-5 py-2 rounded-lg text-sm font-bold font-serif transition-colors border', (selectedCity.hasHarvestedCulture || cannotHarvest) ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-purple-900/60 border-purple-500/50 hover:bg-purple-800 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)]')}><span className="font-cinzel text-lg">+{selectedCityCulture}</span> 획득</button>
            </div>
          )}

          <div className="bg-slate-900/40 rounded-lg p-5 mb-4 border border-slate-700/50 shadow-inner">
            <h4 className="text-lg font-serif font-bold text-amber-500 mb-3 border-b border-amber-700/20 pb-2">건설된 건물 & 불가사의</h4>
            {selectedCity.buildings.length === 0 && (!selectedCity.builtWonders || selectedCity.builtWonders.length === 0) ? (
              <p className="text-slate-500 font-serif text-sm">건설된 건물이나 불가사의가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {selectedCity.buildings.map((building) => {
                  const def = BUILDINGS[building.type];
                  return (
                    <div key={building.id} className="p-3 bg-slate-800/80 border border-slate-700 rounded-md shadow-sm">
                      <div className="text-amber-100 font-serif font-bold text-sm mb-1">{def.name}</div>
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
                        <div key={`wonder-${idx}`} className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-md shadow-sm">
                          <div className="text-indigo-300 font-serif font-bold text-sm flex items-center gap-1.5 mb-1"><span className="text-lg">{WONDER_ICONS[wType] || '🏛️'}</span> {wDef.name}</div>
                          <div className="text-indigo-200/60 text-xs">{wDef.description}</div>
                        </div>
                     )
                   });
                })()}
              </div>
            )}
          </div>

          <div className="bg-slate-900/40 rounded-lg p-5 shadow-inner">
            {isCityParalyzed && (
              <div className="mb-4 p-4 bg-red-900/80 border-2 border-red-500 rounded-lg animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <p className="text-white font-serif font-bold flex items-center gap-3">
                  {isAnarchyCapital ? <><span className="text-2xl">🔥</span> 무정부 폭동으로 인해 수도 기능이 마비되었습니다! (행동 불가)</> : <><span className="text-2xl">⛓️</span> 상대 스파이에 의해 도시가 마비되었습니다! (행동 불가)</>}
                </p>
              </div>
            )}

            {!canManageCity && <div className="mb-4 p-3 bg-yellow-950/60 border border-yellow-600/50 rounded-lg"><p className="text-yellow-400 text-sm font-serif">⚠️ 도시 경영 단계에서만 건설 및 생산이 가능합니다.</p></div>}
            {canManageCity && actionType === 'harvest' && <div className="mb-4 p-3 bg-red-950/60 border border-red-600/50 rounded-lg"><p className="text-red-400 text-sm font-serif">⚠️ 이번 턴에 수확 행동을 마쳐서 더 이상 생산할 수 없습니다.</p></div>}
            {canManageCity && cannotProduce && actionType !== 'harvest' && !isCityParalyzed && <div className="mb-4 p-3 bg-red-950/60 border border-red-600/50 rounded-lg"><p className="text-red-400 text-sm font-serif">⚠️ 생산 한도 도달: {currentProduced >= 2 ? '공학 능력(최대 2회)을 모두 소모했습니다.' : '다른 도시에서 이미 공학 능력을 사용했거나, 공학 기술이 없습니다.'}</p></div>}

            {canManageCity && !cannotProduce && !isCityParalyzed && (
               <div className="mb-5 p-4 bg-slate-900/80 border border-amber-700/50 rounded-lg shadow-inner">
                 <div className="flex justify-between items-center mb-3 border-b border-amber-700/30 pb-2">
                   <h4 className="text-md font-serif font-bold text-amber-400 text-glow-gold">🔄 교역품 긴급 조달</h4>
                   <span className="text-xs text-amber-200/50 font-serif">(비율 - 교역 3 : 생산 {isAmerica ? '2 (🇺🇸 미국)' : '1'})</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="flex-1 flex items-center bg-slate-950 rounded border border-slate-700 p-1 shadow-inner">
                     <button onClick={() => setTradeConvertAmount(Math.max(0, tradeConvertAmount - prodPerClick))} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-500 font-bold rounded border border-slate-600 transition-colors">-</button>
                     <span className="flex-1 text-center text-amber-100 font-serif text-sm">+<span className="font-cinzel font-bold text-lg text-amber-400 mx-1">{tradeConvertAmount}</span> 생산</span>
                     <button onClick={() => setTradeConvertAmount(tradeConvertAmount + prodPerClick)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-500 font-bold rounded border border-slate-600 transition-colors">+</button>
                   </div>
                   <button onClick={handleConvertTrade} disabled={tradeConvertAmount === 0 || currentPlayer.resources.trade < (tradeConvertAmount / prodPerClick) * tradeCostPerClick} className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 border border-amber-500 text-amber-50 font-serif font-bold rounded text-sm transition-colors shadow-md">
                     교역 <span className="font-cinzel text-base mx-1">{tradeConvertAmount === 0 ? 0 : (tradeConvertAmount / prodPerClick) * tradeCostPerClick}</span> 소모
                   </button>
                 </div>
               </div>
            )}

            {/* 탭 메뉴 */}
            <div className="flex gap-2 mb-4 mt-6 border-b border-amber-700/30 pb-2">
              <button onClick={() => setProductionTab('buildings')} className={clsx('px-5 py-2 font-serif text-sm transition-all border-b-2', productionTab === 'buildings' ? 'text-amber-400 border-amber-500 text-glow-gold font-bold' : 'text-slate-400 border-transparent hover:text-amber-200')}>🏗️ 건물</button>
              <button onClick={() => setProductionTab('units')} className={clsx('px-5 py-2 font-serif text-sm transition-all border-b-2', productionTab === 'units' ? 'text-amber-400 border-amber-500 text-glow-gold font-bold' : 'text-slate-400 border-transparent hover:text-amber-200')}>⚔️ 유닛</button>
              <button onClick={() => setProductionTab('armyCards')} className={clsx('px-5 py-2 font-serif text-sm transition-all border-b-2', productionTab === 'armyCards' ? 'text-amber-400 border-amber-500 text-glow-gold font-bold' : 'text-slate-400 border-transparent hover:text-amber-200')}>🃏 부대 카드</button>
              <button onClick={() => setProductionTab('wonders')} className={clsx('px-5 py-2 font-serif text-sm transition-all border-b-2', productionTab === 'wonders' ? 'text-indigo-400 border-indigo-500 text-shadow-[0_0_8px_rgba(129,140,248,0.6)] font-bold' : 'text-indigo-300/60 border-transparent hover:text-indigo-300')}>🗽 불가사의</button>
            </div>

            {/* 불가사의 탭 */}
            {productionTab === 'wonders' && (
              <div className="grid grid-cols-2 gap-3">
                {Object.values(WONDERS).map((wonder) => {
                  let actualCost = wonder.cost;
                  if (wonder.costReductionTech && currentPlayer.technologies.some(t => t.id === wonder.costReductionTech)) actualCost = Math.max(1, actualCost - wonder.costReductionAmount!);

                  const canAfford = availableProduction >= actualCost; 
                  const cityActed = cannotProduce || isCityParalyzed;
                  let isAlreadyBuilt = false;
                  for (const p of players) {
                      if (p.builtWonders?.includes(wonder.type)) { isAlreadyBuilt = true; break; }
                  }
                  const isDisabled = !canManageCity || !canAfford || cityActed || isAlreadyBuilt;
                  
                  return (
                    <motion.button key={wonder.type} whileHover={!isDisabled ? { scale: 1.02 } : {}} onClick={() => handleBuildWonder(wonder)} disabled={isDisabled} className={clsx('p-4 rounded-lg text-left transition-colors border relative overflow-hidden', !isDisabled ? 'bg-slate-800 border-indigo-700/50 hover:bg-slate-700 hover:border-indigo-400 shadow-md' : 'bg-slate-800/50 border-slate-700 opacity-60 cursor-not-allowed')}>
                      <div className="text-indigo-300 font-serif font-bold text-sm flex items-center justify-between gap-1 mb-1">
                          <span>{WONDER_ICONS[wonder.type] || '🏛️'} {wonder.name}</span>
                          {isAlreadyBuilt && <span className="text-[10px] text-red-200 bg-red-900/80 px-1.5 py-0.5 rounded border border-red-500 font-sans">역사 속으로</span>}
                      </div>
                      <div className="text-slate-400 text-xs">{wonder.description}</div>
                      <div className="text-xs mt-2 text-purple-300 font-serif">턴당 문화 <span className="font-cinzel font-bold text-sm">+{wonder.cultureProduction}</span></div>
                      <div className={clsx("text-xs mt-1 font-serif", isAlreadyBuilt ? "text-slate-500" : canAfford ? "text-amber-400" : "text-red-400")}>
                        비용: <span className="font-cinzel font-bold text-base ml-1">{actualCost}</span> {isAlreadyBuilt ? "" : canAfford ? "" : "(부족)"}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 건물 탭 */}
            {productionTab === 'buildings' && (
              <div className="grid grid-cols-2 gap-3">
                {availableBuildings.map((building) => {
                  const canAfford = availableProduction >= building.productionCost;
                  const canUseEgyptFreeBuild = currentPlayer.nation === 'egypt' && !currentPlayer.hasUsedEgyptFreeBuildingThisTurn;
                  const cityActed = cannotProduce || isCityParalyzed;
                  return (
                    <div key={building.type} className={clsx('p-4 rounded-lg text-left transition-colors flex flex-col justify-between border shadow-sm', (canManageCity && (canAfford || canUseEgyptFreeBuild) && !cityActed) ? 'bg-slate-800 border-amber-700/30' : 'bg-slate-800/50 border-slate-700 opacity-60')}>
                      <div>
                          <div className="text-amber-100 font-serif font-bold text-sm mb-1">{building.name}</div>
                          <div className="text-slate-400 text-xs">{building.description}</div>
                          <div className={clsx("text-xs mt-2 font-serif", canAfford ? "text-amber-400" : "text-red-400")}>
                            비용: <span className="font-cinzel font-bold text-base ml-1">{building.productionCost}</span> {canAfford ? "" : "(부족)"}
                          </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                          <button onClick={() => handleBuild(building, false)} disabled={!canManageCity || !canAfford || cityActed} className="flex-1 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-amber-50 text-xs font-serif font-bold rounded border border-amber-500 disabled:border-slate-600 transition-colors shadow-sm">건설</button>
                          {currentPlayer.nation === 'egypt' && <button onClick={() => handleBuild(building, true)} disabled={!canManageCity || !canUseEgyptFreeBuild || cityActed} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-black text-xs font-serif font-bold rounded border border-yellow-300 disabled:border-slate-600 transition-colors shadow-sm">🏺 무료 건설</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 유닛 탭 */}
            {productionTab === 'units' && (
              <div className="grid grid-cols-2 gap-3">
                {(['military', 'settler'] as UnitType[]).map((unitType) => {
                  const def = UNIT_DEFINITIONS[unitType];
                  const currentCount = unitType === 'military' ? militaryCount : settlerCount;
                  const isMaxed = currentCount >= (unitType === 'military' ? 6 : 2);
                  const canAfford = availableProduction >= def.productionCost;
                  const cityActed = cannotProduce || isCityParalyzed;
                  const isDisabled = isMaxed || !canManageCity || !canAfford || cityActed;
                  return (
                    <button key={unitType} onClick={() => handleProduceUnit(unitType)} disabled={isDisabled} className={clsx('p-4 rounded-lg text-left transition-colors border shadow-sm', isDisabled ? 'bg-slate-800/50 border-slate-700 opacity-60 cursor-not-allowed' : 'bg-slate-800 border-amber-700/30 hover:bg-slate-700 hover:border-amber-500')}>
                      <div className="text-amber-100 font-serif font-bold text-sm flex items-center gap-2 mb-1"><span className="text-lg">{unitType === 'military' ? '⚔️' : '👷'}</span> {def.name}</div>
                      <div className="text-slate-400 text-xs">{def.description}</div>
                      <div className={clsx("text-xs mt-2 font-serif", canAfford ? "text-amber-400" : "text-red-400")}>
                        비용: <span className="font-cinzel font-bold text-base ml-1">{def.productionCost}</span>
                      </div>
                      <div className="text-slate-400 text-xs mt-1 font-serif">보유: <span className="font-cinzel font-bold">{currentCount}</span><span className="font-cinzel text-slate-500">/{(unitType === 'military' ? 6 : 2)}</span></div>
                      {isMaxed && <div className="text-red-400 text-xs mt-1 font-serif font-bold">최대치 도달</div>}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* 부대 카드 탭 */}
            {productionTab === 'armyCards' && (
              <div className="grid grid-cols-2 gap-3">
                {availableArmyCards.map((card) => {
                  const canAfford = availableProduction >= card.productionCost;
                  const cityActed = cannotProduce || isCityParalyzed;
                  const isDisabled = !canManageCity || !canAfford || cityActed;
                  const cardIcon = ({ infantry: '🗡️', artillery: '💣', cavalry: '🐴', airforce: '✈️', settler: '' } as Record<string, string>)[card.type] || '🗡️';

                  return (
                    <div key={`${card.type}-${card.tier}`} className={clsx('p-4 rounded-lg text-left flex flex-col justify-between border shadow-sm', isDisabled ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-slate-800 border-amber-700/30 hover:border-amber-500 transition-colors')}>
                      <div>
                          <div className="text-amber-100 font-serif font-bold text-sm flex items-center gap-2 mb-1"><span className="text-lg">{cardIcon}</span> {card.name}</div>
                          <div className="text-amber-200/60 font-serif text-xs">티어 <span className="font-cinzel font-bold">{card.tier}</span> 부대</div>
                          <div className={clsx("text-xs mt-2 font-serif", canAfford ? "text-amber-400" : "text-red-400")}>
                            비용: <span className="font-cinzel font-bold text-base ml-1">{card.productionCost}</span> {canAfford ? "" : "(부족)"}
                          </div>
                          <div className="text-slate-400 text-[10px] mt-2 flex items-center gap-1 font-sans"><span>🎲</span> 능력치(방어/공수/공격) 랜덤 부여</div>
                      </div>
                      <div className="mt-3">
                          <button onClick={() => handleProduceArmyCard(card.type, card.tier, card.name, card.productionCost)} disabled={isDisabled} className="w-full py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-amber-50 text-xs font-serif font-bold rounded border border-amber-500 disabled:border-slate-600 transition-colors shadow-sm">부대 징집</button>
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
    </div>
  );
}