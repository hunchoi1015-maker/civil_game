import { useGameStore } from '../../store/gameStore';
import { GamePhase } from '../../types';
import clsx from 'clsx';

// 모든 단계는 순차 진행 (선플레이어부터)
const PHASES: { id: GamePhase; name: string; icon: string }[] = [
  { id: 'start', name: '시작', icon: '🌅' },
  { id: 'trade', name: '교역', icon: '💱' },
  { id: 'cityManagement', name: '도시', icon: '🏛️' },
  { id: 'movement', name: '이동', icon: '🚶' },
  { id: 'research', name: '연구', icon: '🔬' },
];

export function PhaseIndicator() {
  const { currentPhase, endPhaseForCurrentPlayer } = useGameStore();

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, index) => {
        const isCurrent = phase.id === currentPhase;
        const isPast = PHASES.findIndex((p) => p.id === currentPhase) > index;

        return (
          <div key={phase.id} className="flex items-center">
            <div
              className={clsx(
                'flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors',
                isCurrent && 'bg-amber-600 text-white',
                isPast && 'bg-slate-600 text-slate-400',
                !isCurrent && !isPast && 'bg-slate-700 text-slate-500'
              )}
            >
              <span>{phase.icon}</span>
              <span className="hidden md:inline">{phase.name}</span>
            </div>
            {index < PHASES.length - 1 && (
              <div className={clsx('w-4 h-0.5 mx-1', isPast ? 'bg-slate-600' : 'bg-slate-700')} />
            )}
          </div>
        );
      })}

      <button
        onClick={endPhaseForCurrentPlayer}
        className="ml-4 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors"
      >
        다음 →
      </button>
    </div>
  );
}
