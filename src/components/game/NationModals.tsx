// src/components/game/NationModals.tsx
import { useGameStore } from '../../store/gameStore';
import { canLearnTechInPyramid } from '../../store/helpers/validationHelpers';

export function NationModals() {
  const { 
      russiaStealPrompt, resolveRussiaSteal, 
      germanyResourcePrompt, resolveGermanyResource,
      chinaGraveyardPrompt, resolveChinaGraveyard,
      players, currentPlayerIndex, marketResources
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  return (
      <>
        {/* 🐻 러시아 기술 훔치기 모달 */}
        {russiaStealPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-[400px] border border-blue-500">
              <h2 className="text-xl font-bold text-white mb-4">🐻 러시아 특성: 기술 도용</h2>
              <p className="text-slate-300 text-sm mb-4">
                적 도시에 도달했습니다! 유닛을 희생하여 적의 기술을 훔치겠습니까? <br/>
                <span className="text-red-400 font-bold">(기술 훔치기를 선택하면 전투 없이 유닛이 소멸합니다)</span>
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {players.find(p => p.id === russiaStealPrompt.targetPlayerId)?.technologies
                  .filter(t => !currentPlayer.technologies.some(my => my.id === t.id) && canLearnTechInPyramid(currentPlayer, t.id).canResearch)
                  .map(tech => (
                    <button
                      key={tech.id}
                      onClick={() => resolveRussiaSteal(tech.id)}
                      className="w-full p-2 bg-blue-900/50 hover:bg-blue-600 text-white rounded border border-blue-700 text-left text-sm transition-colors"
                    >
                      🚀 [{tech.name}] 훔치기 (유닛 희생)
                    </button>
                  ))}
              </div>

              <button
                onClick={() => resolveRussiaSteal(null)}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors"
              >
                ⚔️ 도용하지 않고 도시 공격하기
              </button>
            </div>
          </div>
        )}

        {/* ⚙️ 독일 자원 선택 모달 */}
        {germanyResourcePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-96 border border-gray-500">
              <h2 className="text-xl font-bold text-white mb-4">⚙️ 독일 특성: 전리품 획득</h2>
              <p className="text-slate-300 text-sm mb-4">
                부대 진급 연구를 완료했습니다! 보너스 정예 부대와 함께 시장에서 원하는 자원을 1개 선택하세요.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['spice', 'wheat', 'silk', 'iron'].map(res => {
                    const count = marketResources[res as keyof typeof marketResources];
                    return (
                        <button
                          key={res}
                          disabled={count <= 0}
                          onClick={() => resolveGermanyResource(res)}
                          className="p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white rounded font-bold capitalize transition-colors"
                        >
                          {res === 'spice' ? '🌶️ 향료' : res === 'wheat' ? '🌾 밀' : res === 'silk' ? '🧶 비단' : '⛏️ 철'} ({count}개)
                        </button>
                    );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 🐉 중국 묘지 부활 모달 */}
        {chinaGraveyardPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-96 border border-red-500">
              <h2 className="text-xl font-bold text-white mb-4">🐉 중국 특성: 전사자 귀환</h2>
              <p className="text-slate-300 text-sm mb-4">
                전투가 종료되었습니다. 이번 전투에서 전사한 부대 중 1개를 선택하여 체력을 모두 회복한 상태로 덱에 반환합니다.
              </p>
              <div className="space-y-2 mb-4">
                {chinaGraveyardPrompt.cards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => resolveChinaGraveyard(card.id)}
                    className="w-full p-2 bg-red-900/50 hover:bg-red-600 text-white rounded border border-red-700 text-left text-sm transition-colors"
                  >
                    💂 {card.name} (공:{card.attack} 체:{card.maxHealth}) 부활시키기
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
  );
}