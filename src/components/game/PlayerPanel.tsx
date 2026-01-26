import { useGameStore } from '../../store/gameStore';
import { GOVERNMENT_EFFECTS } from '../../types';

const PLAYER_COLORS_BG: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
};

export function PlayerPanel() {
  const { players, currentPlayerIndex } = useGameStore();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">플레이어</h2>

      {players.map((player, index) => {
        const isCurrentPlayer = index === currentPlayerIndex;
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

            {/* 자원 */}
            <div className="grid grid-cols-2 gap-1 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-amber-400">📦</span>
                <span className="text-slate-300">교역: {player.resources.trade}/27</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">💰</span>
                <span className="text-slate-300">화폐: {player.resources.currency}/15</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-purple-400">🎭</span>
                <span className="text-slate-300">문화: {player.cultureTrack}/20</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-400">🔨</span>
                <span className="text-slate-300">생산: {player.resources.production}</span>
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
