// src/components/game/PlayerPanel.tsx

import { useGameStore } from '../../store/gameStore';
import { GOVERNMENTS } from '../../constants/governments';
import { NATIONS } from '../../types/nation';
import clsx from 'clsx'; // 🌟 추가됨

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
      {/* 🌟 폰트 세리프 및 빛번짐 적용 */}
      <h2 className="text-xl font-serif font-black text-amber-500 border-b border-amber-700/30 pb-2 mb-4 text-glow-gold">
        플레이어 현황
      </h2>

      {players.map((player, index) => {
        const isCurrentPlayer = index === currentPlayerIndex;
        const isMe = index === currentPlayerIndex;
        const govEffect = player.government ? GOVERNMENTS[player.government] : null;
        const nationDef = player.nation ? NATIONS[player.nation as keyof typeof NATIONS] : null;

        const groupedSecret = isMe ? player.secretResources?.reduce((acc, res) => {
          const k = `${res.type}-${res.source}`;
          if (!acc[k]) acc[k] = { type: res.type, source: res.source, count: 0 };
          acc[k].count++;
          return acc;
        }, {} as Record<string, { type: string, source: string, count: number }>) : null;

        const obfuscatedSecret = !isMe ? player.secretResources?.reduce((acc, res) => {
          acc[res.source] = (acc[res.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) : null;

        const hasAnyResource = !Object.values(player.luxuryResources).every(c => c === 0) || (player.secretResources && player.secretResources.length > 0);

        return (
          <div
            key={player.id}
            // 🌟 현재 플레이어는 패널 텍스처와 빛 번짐 적용, 아니면 어둡게 축소
            className={clsx(
              'p-4 rounded-lg transition-all duration-300 relative',
              isCurrentPlayer 
                ? 'panel-texture shadow-glow-gold scale-[1.02] border-amber-500' 
                : 'bg-slate-900/50 border border-slate-700/50 opacity-80 hover:opacity-100'
            )}
          >
            {/* 🌟 패널 내부 컨텐츠 */}
            <div className="panel-content">
              {/* 플레이어 헤더 */}
              <div className="flex items-center gap-2 mb-3 border-b border-amber-700/30 pb-2">
                <div className={`w-3 h-3 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)] ${PLAYER_COLORS_BG[player.color]}`} />
                <span className="text-amber-50 font-serif font-bold text-lg leading-none">{player.name}</span>
                
                {nationDef && (
                  <span className="text-[10px] text-amber-200/80 font-serif ml-1 px-1.5 py-0.5 bg-slate-950/60 rounded border border-amber-900/50 shadow-inner">
                    {nationDef.flag} {nationDef.name}
                  </span>
                )}
                {isCurrentPlayer && (
                  <span className="text-xs text-amber-400 font-bold ml-auto animate-pulse">▶ 현재 턴</span>
                )}
              </div>

              {/* 기본 자원 */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="bg-slate-950/60 border border-slate-700/50 p-1.5 rounded flex items-center justify-between shadow-inner">
                  <span className="text-amber-400/80 text-xs font-serif">📦 교역</span>
                  <span className="font-cinzel font-bold text-amber-400">{player.resources.trade}<span className="text-[10px] text-slate-500">/27</span></span>
                </div>
                <div className="bg-slate-950/60 border border-slate-700/50 p-1.5 rounded flex items-center justify-between shadow-inner">
                  <span className="text-yellow-400/80 text-xs font-serif">💰 화폐</span>
                  <span className="font-cinzel font-bold text-yellow-400">{player.resources.currency}<span className="text-[10px] text-slate-500">/15</span></span>
                </div>
              </div>

              {/* 문화 자원 시각화 */}
              <div className="mb-3 bg-slate-950/80 p-2.5 rounded border border-purple-900/50 shadow-inner">
                <div className="flex justify-between items-center text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 font-serif font-bold text-purple-300 text-shadow-[0_0_5px_rgba(216,180,254,0.5)]">
                    <span>📜</span> 문화 자원
                  </span>
                  <span className="font-cinzel text-purple-300 font-bold">
                    {player.resources.culture || 0} <span className="text-slate-500 text-[10px]">/ 50</span>
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-purple-900 via-purple-600 to-purple-400 h-full rounded-full transition-all duration-500 relative" 
                    style={{ width: `${Math.min(100, ((player.resources.culture || 0) / 50) * 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-xs bg-slate-950/50 p-2 rounded border border-slate-700/50 shadow-inner">
                 <span title="위인" className="text-slate-300 font-serif">🗿 위인 <span className="font-cinzel text-amber-200 font-bold ml-1">{player.greatPeople}</span></span>
                 {isMe && (
                   <div className="flex gap-3">
                     <span title="스파이" className="text-slate-300 font-serif">🕵️ 스파이 <span className="font-cinzel text-blue-200 font-bold ml-1">{player.spies}</span></span>
                     <span title="핵 자원" className="text-slate-300 font-serif">☢️ 우라늄 <span className="font-cinzel text-green-300 font-bold ml-1">{player.nuclearMaterial}</span></span>
                   </div>
                 )}
              </div>

              <div className="mt-3 pt-3 border-t border-amber-700/30">
                <div className="text-[11px] text-amber-200/60 font-serif mb-2">보유 사치/비밀 자원</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(player.luxuryResources).map(([key, count]) => {
                    if (count <= 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-1 text-xs bg-slate-950/80 px-2 py-1 rounded-md text-amber-100 border border-amber-900/50 shadow-sm">
                        <span className="text-base">{RESOURCE_ICONS[key]}</span>
                        <span className="font-cinzel font-bold">{count}</span>
                      </div>
                    );
                  })}
                  
                  {isMe && groupedSecret && Object.values(groupedSecret).map(group => (
                    <div key={`${group.type}-${group.source}`} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border shadow-sm ${group.source === 'hut' ? 'bg-green-950/80 border-green-800/50 text-green-200' : 'bg-red-950/80 border-red-800/50 text-red-200'}`} title={group.source === 'hut' ? '오두막 발견 자원' : '마을 토벌 자원'}>
                      <span className="text-base">{RESOURCE_ICONS[group.type]}</span>
                      <span className="font-cinzel font-bold">{group.count}</span>
                      <span className="text-[9px] font-serif ml-0.5 opacity-60 mt-0.5">({group.source === 'hut' ? '오두막' : '마을'})</span>
                    </div>
                  ))}
                  
                  {!isMe && obfuscatedSecret && Object.entries(obfuscatedSecret).map(([source, count]) => (
                    <div key={source} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border shadow-sm ${source === 'hut' ? 'bg-green-950/30 border-green-900/50 text-green-500' : 'bg-red-950/30 border-red-900/50 text-red-500'}`} title="정체불명의 자원">
                      <span className="text-sm">❓</span>
                      <span className="font-cinzel font-bold">{count}</span>
                      <span className="text-[9px] font-serif ml-0.5 opacity-60 mt-0.5">({source === 'hut' ? '오두막' : '마을'})</span>
                    </div>
                  ))}

                  {!hasAnyResource && (
                    <span className="text-[11px] text-slate-500 font-serif italic px-1">- 비어 있음 -</span>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-2 flex flex-col gap-1.5 border-t border-amber-700/30">
                {govEffect && (
                  <div className="text-xs text-amber-200/80 font-serif flex items-center justify-between">
                    <span>정치체제</span>
                    <span className="font-bold text-amber-400">{govEffect.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-slate-400 font-serif mt-1">
                  <span>도시 <span className="font-cinzel font-bold text-slate-200 ml-1">{player.cities.length}</span>/3</span>
                  <span>유닛 <span className="font-cinzel font-bold text-slate-200 ml-1">{player.units.length}</span></span>
                  <span>기술 <span className="font-cinzel font-bold text-slate-200 ml-1">{player.technologies.length}</span></span>
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}