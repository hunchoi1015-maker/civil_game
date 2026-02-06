import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../store/gameStore';
import {CombatPanel} from '../components/game/Combat/CombatPanel';
import { ArmyCard, ArmyCardType, ArmyTier } from '../types';

const UNIT_TYPES: ArmyCardType[] = ['infantry', 'cavalry', 'artillery', 'airforce', 'settler'];
const TIERS: ArmyTier[] = [1, 2, 3, 4];

export default function DevCombatSim() {
  const { combatState, startDevCombat, endCombat } = useGameStore();
  
  // 설정 상태
  const [attCards, setAttCards] = useState<ArmyCard[]>([]);
  const [defCards, setDefCards] = useState<ArmyCard[]>([]);
  const [attBonus, setAttBonus] = useState(0);
  const [defBonus, setDefBonus] = useState(0);
  const [attCityDef, setAttCityDef] = useState(0);
  const [defCityDef, setDefCityDef] = useState(0);
  const [combatType, setCombatType] = useState<'field' | 'city' | 'capital'>('field');

  // 유닛 생성기 상태
  const [selectedType, setSelectedType] = useState<ArmyCardType>('infantry');
  const [selectedTier, setSelectedTier] = useState<ArmyTier>(1);
  const [selectedAtk, setSelectedAtk] = useState(2);
  const [selectedHp, setSelectedHp] = useState(2);

  const addCard = (side: 'attacker' | 'defender') => {
    const newCard: ArmyCard = {
      id: uuidv4(),
      type: selectedType,
      tier: selectedTier,
      ownerId: side === 'attacker' ? 'dev-attacker' : 'dev-defender',
      name: `${selectedType} T${selectedTier}`,
      attack: selectedAtk,
      health: selectedHp,
      maxHealth: selectedHp,
      isDeployed:false
    };
    if (side === 'attacker') setAttCards([...attCards, newCard]);
    else setDefCards([...defCards, newCard]);
  };

  const handleStart = () => {
    startDevCombat(
      [...attCards], // 복사본 전달
      [...defCards], 
      attBonus, 
      defBonus, 
      attCityDef,
      defCityDef,
      combatType
    );
  };

  if (combatState.isActive) {
    return (
      <div className="w-full h-screen bg-slate-900 relative">
        <CombatPanel />
        <button 
          onClick={endCombat}
          className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded text-white z-50 hover:bg-red-700"
        >
          시뮬레이션 종료
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8 text-yellow-400">⚔️ 전투 시뮬레이터 (Dev Mode)</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 설정 패널 */}
        <div className="bg-slate-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">1. 유닛 생성 설정</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400">Type</label>
              <select 
                className="w-full bg-slate-700 p-2 rounded"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
              >
                {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400">Tier</label>
              <select 
                className="w-full bg-slate-700 p-2 rounded"
                value={selectedTier}
                onChange={(e) => setSelectedTier(Number(e.target.value) as any)}
              >
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400">Attack</label>
              <input type="number" className="w-full bg-slate-700 p-2 rounded" value={selectedAtk} onChange={e => setSelectedAtk(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Health</label>
              <input type="number" className="w-full bg-slate-700 p-2 rounded" value={selectedHp} onChange={e => setSelectedHp(Number(e.target.value))} />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button onClick={() => addCard('attacker')} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded font-bold">+ 공격측에 추가</button>
            <button onClick={() => addCard('defender')} className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold">+ 방어측에 추가</button>
          </div>

          <div className="pt-4 border-t border-slate-600 mt-4">
             <h2 className="text-xl font-bold mb-4">2. 전장 설정</h2>
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span>전투 타입</span>
                    <select value={combatType} onChange={e => setCombatType(e.target.value as any)} className="bg-slate-700 rounded p-1">
                        <option value="field">평지 (Field)</option>
                        <option value="city">도시 (City)</option>
                        <option value="capital">수도 (Capital)</option>
                    </select>
                </div>
                <div className="flex justify-between items-center text-red-300">
                    <span>공격자 전투 보너스</span>
                    <input type="number" className="w-16 bg-slate-700 rounded p-1 text-right" value={attBonus} onChange={e => setAttBonus(Number(e.target.value))} />
                </div>
                <div className="flex justify-between items-center text-blue-300">
                    <span>방어자 전투 보너스</span>
                    <input type="number" className="w-16 bg-slate-700 rounded p-1 text-right" value={defBonus} onChange={e => setDefBonus(Number(e.target.value))} />
                </div>
                <div className="flex justify-between items-center text-green-300">
                    <span>방어자 도시방어(성벽)</span>
                    <input type="number" className="w-16 bg-slate-700 rounded p-1 text-right" value={defCityDef} onChange={e => setDefCityDef(Number(e.target.value))} />
                </div>
             </div>
          </div>

          <button onClick={handleStart} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-lg mt-6 text-xl">
            전투 시뮬레이션 시작!
          </button>
        </div>

        {/* 공격자 덱 미리보기 */}
        <div className="bg-red-900/30 border border-red-500/50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex justify-between">
            공격자 핸드 
            <span className="text-sm bg-red-800 px-2 py-1 rounded">{attCards.length}장</span>
          </h3>
          <ul className="space-y-2 max-h-[600px] overflow-y-auto">
            {attCards.map((c, i) => (
              <li key={c.id} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm border border-slate-600">
                <span>{c.name}</span>
                <span className="font-mono text-xs text-gray-400">ATK:{c.attack} HP:{c.health}</span>
                <button onClick={() => setAttCards(attCards.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-300 ml-2">x</button>
              </li>
            ))}
            {attCards.length === 0 && <li className="text-gray-500 text-center py-4">카드가 없습니다.</li>}
          </ul>
        </div>

        {/* 방어자 덱 미리보기 */}
        <div className="bg-blue-900/30 border border-blue-500/50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-blue-400 mb-4 flex justify-between">
            방어자 핸드
            <span className="text-sm bg-blue-800 px-2 py-1 rounded">{defCards.length}장</span>
          </h3>
          <ul className="space-y-2 max-h-[600px] overflow-y-auto">
            {defCards.map((c, i) => (
              <li key={c.id} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm border border-slate-600">
                <span>{c.name}</span>
                <span className="font-mono text-xs text-gray-400">ATK:{c.attack} HP:{c.health}</span>
                <button onClick={() => setDefCards(defCards.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-300 ml-2">x</button>
              </li>
            ))}
            {defCards.length === 0 && <li className="text-gray-500 text-center py-4">카드가 없습니다.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}