import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { CULTURE_TRACK_MAX, GREAT_PERSON_SPOTS, getCultureLevel } from '../../constants/culture';
import clsx from 'clsx';

interface CultureTrackModalProps {
  onClose: () => void;
}

export function CultureTrackModal({ onClose }: CultureTrackModalProps) {
  const { players } = useGameStore();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 rounded-xl p-6 w-[900px] max-w-full border border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎭</span> 문화 트랙
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* 트랙 레벨 구분 표시 */}
        <div className="flex text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider text-center">
          <span className="flex-1 text-green-500 border-b-2 border-green-900 pb-1">Level 1 (1-7)</span>
          <span className="flex-1 text-blue-500 border-b-2 border-blue-900 pb-1">Level 2 (8-14)</span>
          <span className="flex-1 text-purple-500 border-b-2 border-purple-900 pb-1">Level 3 (15-21)</span>
        </div>

        {/* 트랙 그리드 (21칸) */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {Array.from({ length: CULTURE_TRACK_MAX }).map((_, i) => {
            const step = i + 1;
            const level = getCultureLevel(step);
            const isGreatPersonSpot = GREAT_PERSON_SPOTS.includes(step);
            const playersOnStep = players.filter(p => p.cultureTrack === step);

            return (
              <div 
                key={step}
                className={clsx(
                  "h-24 rounded-lg border flex flex-col items-center justify-between p-2 relative transition-colors",
                  level === 1 ? "bg-green-900/10 border-green-900/50" :
                  level === 2 ? "bg-blue-900/10 border-blue-900/50" :
                  "bg-purple-900/10 border-purple-900/50",
                  playersOnStep.length > 0 && "ring-1 ring-white/30"
                )}
              >
                {/* 칸 번호 */}
                <div className="text-xs font-mono text-slate-600">{step}</div>

                {/* 보상 아이콘 */}
                {isGreatPersonSpot ? (
                  <div className="text-2xl animate-pulse" title="위인 획득">🗿</div>
                ) : (
                  <div className="text-xl opacity-20" title="문화 이벤트 카드">🃏</div>
                )}

                {/* 플레이어 마커 */}
                <div className="flex flex-wrap justify-center gap-1 w-full min-h-[12px]">
                  {playersOnStep.map(p => (
                    <div 
                      key={p.id} 
                      className={`w-3 h-3 rounded-full shadow-md ring-1 ring-white/50 bg-${p.color}-500`}
                      title={`${p.name} (현재 위치)`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between items-end bg-slate-800/50 p-4 rounded-lg">
          <div className="text-sm text-slate-400 space-y-1">
            <p className="flex items-center gap-2"><span className="text-xl">🗿</span> 해당 칸 도착 시 위인을 획득하고 즉시 배치합니다.</p>
            <p className="flex items-center gap-2"><span className="text-xl opacity-50">🃏</span> 일반 칸에서는 문화 이벤트 카드를 획득합니다.</p>
            <p className="text-purple-400 font-bold mt-2">✨ 21번째 칸에 도달하면 문화 승리를 달성합니다!</p>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
}