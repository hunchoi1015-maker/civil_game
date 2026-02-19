import { useGameStore } from '../../store/gameStore';
import { GOVERNMENT_EFFECTS } from '../../types';

const PLAYER_COLORS_BG: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
};

const RESOURCE_ICONS: Record<string, string> = {
  spice: '🏺',
  wheat: '🌾',
  silk: '🧣',
  iron: '⛏️',
};

export function PlayerPanel() {
  const { players, currentPlayerIndex } = useGameStore();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">플레이어</h2>

      {players.map((player, index) => {
        const isCurrentPlayer = index === currentPlayerIndex;
        const isMe = index === currentPlayerIndex;
        const govEffect = player.government ? GOVERNMENT_EFFECTS[player.government] : null;

        return (
          <div
            key={player.id}
            className={`p-3 rounded-lg ${
              isCurrentPlayer ? 'bg-slate-700 ring-2 ring-amber-500' : 'bg-slate-750'
            }`}
          >
            {/* 플레이어 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full ${PLAYER_COLORS_BG[player.color]}`} />
              <span className="text-white font-medium">{player.name}</span>
              {isCurrentPlayer && (
                <span className="text-xs text-amber-500 ml-auto">현재 턴</span>
              )}
            </div>

            {/* 기본 자원 */}
            <div className="grid grid-cols-2 gap-1 text-sm mb-2">
              <div className="flex items-center gap-1">
                <span className="text-amber-400">📦</span>
                <span className="text-slate-300">교역: {player.resources.trade}/27</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">💰</span>
                <span className="text-slate-300">화폐: {player.resources.currency}/15</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-400">🔨</span>
                <span className="text-slate-300">생산: {player.resources.production}</span>
              </div>
            </div>

            {/* 🌟 문화 자원 시각화 (진행 게이지 바) 🌟 */}
            <div className="mt-1 mb-3 bg-slate-800/80 p-2 rounded border border-purple-900/50">
              <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                <span className="flex items-center gap-1 font-semibold text-purple-300">
                  <span>📜</span> 문화 자원
                </span>
                <span className="font-mono text-purple-200">
                  {player.resources.culture || 0} <span className="text-slate-500">/ 50</span>
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-700/50">
                <div 
                  className="bg-gradient-to-r from-purple-700 to-purple-400 h-full rounded-full transition-all duration-500 relative" 
                  style={{ width: `${Math.min(100, ((player.resources.culture || 0) / 50) * 100)}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 text-xs bg-black/20 p-1 rounded">
               <span title="위인" className="text-slate-300">🗿 {player.greatPeople}</span>
               {isMe && (
                 <>
                   <span title="스파이" className="text-slate-300 ml-2">🕵️ {player.spies}</span>
                   <span title="핵 자원" className="text-slate-300 ml-2">☢️ {player.nuclearMaterial}</span>
                 </>
               )}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-600/50">
              <div className="text-xs text-slate-400 mb-1">보유 사치품</div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(player.luxuryResources).map(([key, count]) => {
                  if (count <= 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-1 text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-600">
                      <span>{RESOURCE_ICONS[key]}</span>
                      <span>{count}</span>
                    </div>
                  );
                })}
                {Object.values(player.luxuryResources).every(c => c === 0) && (
                  <span className="text-xs text-slate-600">- 없음 -</span>
                )}
              </div>
            </div>
            
            {/* 정치체제 */}
            {govEffect && (
              <div className="mt-2 text-xs text-slate-400">
                정치체제: {govEffect.name}
              </div>
            )}

            {/* 보유 현황 */}
            <div className="mt-2 flex gap-2 text-xs text-slate-400">
              <span>도시: {player.cities.length}/3</span>
              <span>유닛: {player.units.length}</span>
              <span>기술: {player.technologies.length}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}