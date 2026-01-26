import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function RulesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-3xl mx-auto"
      >
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white mb-8 flex items-center gap-2"
        >
          ← 메인 메뉴로
        </button>

        <h1 className="text-4xl font-bold text-amber-500 mb-8">게임 규칙</h1>

        <div className="space-y-8 text-slate-300">
          {/* 게임 개요 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">게임 개요</h2>
            <p className="mb-2">
              문명은 2-4인 턴제 전략 보드게임입니다. 플레이어는 자신의 문명을 발전시켜
              4가지 승리 조건 중 하나를 달성해야 합니다.
            </p>
          </section>

          {/* 턴 구조 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">턴 구조</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>차례 시작</strong> - 정치체제 변경, 도시 건설</li>
              <li><strong>교역</strong> - 자원 교환, 교역 토큰 획득 (동시 진행)</li>
              <li><strong>도시 경영</strong> - 건물 건설, 유닛 생산 (순차 진행)</li>
              <li><strong>이동</strong> - 유닛 이동, 전투 (순차 진행)</li>
              <li><strong>연구</strong> - 기술 연구 (동시 진행)</li>
            </ol>
          </section>

          {/* 자원 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">자원</h2>
            <ul className="space-y-2">
              <li><span className="text-amber-400">교역 토큰</span> - 최대 27개, 기술 연구에 사용</li>
              <li><span className="text-orange-400">생산력</span> - 도시별로 계산, 건물/유닛 생산</li>
              <li><span className="text-purple-400">문화</span> - 문화 트랙 진행, 문화 승리 조건</li>
              <li><span className="text-yellow-400">화폐</span> - 15개 모으면 경제 승리</li>
            </ul>
          </section>

          {/* 도시 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">도시</h2>
            <p className="mb-2">
              각 플레이어는 수도를 포함해 최대 3개의 도시를 보유할 수 있습니다.
              도시 주변 8칸은 교외 지역으로 자원을 제공합니다.
            </p>
            <p>
              도시에서는 건물을 건설하여 보너스를 얻고, 유닛을 생산할 수 있습니다.
            </p>
          </section>

          {/* 유닛 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">유닛</h2>
            <ul className="space-y-2">
              <li><strong>군사 유닛</strong> - 최대 6개, 전투와 방어</li>
              <li><strong>개척자</strong> - 최대 2개, 새 도시 건설 또는 타일 영토 할당</li>
            </ul>
          </section>

          {/* 전투 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">전투</h2>
            <p className="mb-2">
              부대 카드는 4종류(보병, 포병, 기병, 공군)와 4단계가 있습니다.
            </p>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="font-semibold mb-2">상성 관계:</p>
              <p>보병 → 기병 → 포병 → 보병</p>
              <p className="text-sm text-slate-400 mt-2">강한 상대에게 +2, 약한 상대에게 -2</p>
            </div>
          </section>

          {/* 기술 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">기술</h2>
            <p className="mb-2">
              기술은 5단계 피라미드 구조입니다. 상위 단계 기술을 연구하려면
              하위 단계 기술이 충분히 연구되어 있어야 합니다.
            </p>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p>2단계 연구: 1단계 기술 1개 이상 필요</p>
              <p>3단계 연구: 2단계 기술 2개 이상 필요</p>
              <p>4단계 연구: 3단계 기술 3개 이상 필요</p>
              <p>5단계 연구: 4단계 기술 4개 이상 필요</p>
            </div>
          </section>

          {/* 승리 조건 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">승리 조건</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">🔬 과학 승리</span>
                <span>- 5단계 기술 "우주 비행" 연구</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🎭 문화 승리</span>
                <span>- 문화 트랙 20 달성</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">⚔️ 군사 승리</span>
                <span>- 다른 모든 플레이어의 수도 파괴</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">💰 경제 승리</span>
                <span>- 화폐 15개 보유</span>
              </li>
            </ul>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
