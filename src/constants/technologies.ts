import { Technology } from '../types/tech';

export const TECHNOLOGIES: Technology[] = [
  // ================= [1레벨 기술] =================
  {
    id: 'currency', name: '통화', level: 1, isStartingTechFor: 'america',
    description: "해제 건물: 시장\n도시경영: '향료' 1개 소모해 문화 토큰 3개 획득",
    unlocksBuildings: ['market'], resourceAbility: { description: "향료 1개 소모 -> 문화 3 획득" }
  },
  {
    id: 'horseback_riding', name: '승마', level: 1,
    description: "이동 속도: 3\n교역 단계: 비단 소모하여 교역 9 획득, 상대 한명 선택해 교역 6 부여",
    passiveEffects: { movementBonus: 1 }, resourceAbility: { description: "비단 1개 소모 -> 교역 9 (상대 1명 교역 6)" }
  },
  {
    id: 'masonry', name: '석조기술', level: 1, isStartingTechFor: 'china',
    description: "배치제한: 3\n해제 건물: 성벽",
    unlocksBuildings: ['walls'], passiveEffects: { stackingLimitBonus: 1 }
  },
  {
    id: 'metal_casting', name: '금속가공', level: 1, isStartingTechFor: 'germany',
    description: "해제 건물: 병영\n전투 시: 철 1개 소모해 부대 공격력 +3 (1부대)",
    unlocksBuildings: ['barracks'], resourceAbility: { description: "철 1개 소모 -> 부대 공격력 +3" }
  },
  {
    id: 'pottery', name: '도자기', level: 1,
    description: "해제 건물: 곡물창고\n이벤트카드 제한 +1\n도시경영: 임의 자원 2개 소모해 화폐 토큰 1개 추가 (최대 4)",
    unlocksBuildings: ['granary'], passiveEffects: { cultureCardLimitBonus: 1 }, resourceAbility: { description: "자원 2개 소모 -> 화폐 토큰 +1", maxTokens: 4 }
  },
  {
    id: 'philosophy', name: '철학', level: 1,
    description: "해제 건물: 신전\n도시경영: 임의 자원 3개 소모해 위인 마커 1개 획득",
    unlocksBuildings: ['temple'], resourceAbility: { description: "자원 3개 소모 -> 위인 +1" }
  },
  {
    id: 'code_of_laws', name: '법계', level: 1, isStartingTechFor: 'rome',
    description: "해제 건물: 교역소\n해제 정치체제: 공화제\n전투 승리 후 화폐 토큰 1개 추가 (최대 4)",
    unlocksBuildings: ['trading_post'], unlocksGovernment: 'republic', resourceAbility: { description: "전투 승리 시 -> 화폐 토큰 +1 (수동 발동)", maxTokens: 4 }
  },
  {
    id: 'writing', name: '기록', level: 1,
    description: "해제 건물: 도서관\n도시경영: 스파이 1개 소모해 다음 턴 상대 도시 1곳 행동 불가",
    unlocksBuildings: ['library'], resourceAbility: { description: "스파이 1개 소모 -> 상대 도시 지목 (다음 턴 행동 불가)" }
  },
  {
    id: 'animal_husbandry', name: '축산', level: 1,
    description: "매 전투 1번, 부상 3 치료\n도시경영: 밀 1개 소모해 도시 생산력 +3",
    resourceAbility: { description: "밀 1개 소모 -> 도시 생산력 +3 (전투 시 부상 3 치료)" }
  },
  {
    id: 'sailing', name: '항해술', level: 1,
    description: "해제 건물: 항구\n물을 건널 수 있다. (마칠 수는 없음)",
    unlocksBuildings: ['harbor'], passiveEffects: { waterMovement: true }
  },

  // ================= [2레벨 기술] =================
  {
    id: 'construction', name: '건설', level: 2, isStartingTechFor: 'egypt',
    description: "해제 건물: 작업장\n도시경영: 밀 1개 소모해 도시 생산력 +5",
    unlocksBuildings: ['workshop'], resourceAbility: { description: "밀 1개 소모 -> 도시 생산력 +5" }
  },
  {
    id: 'irrigation', name: '관개', level: 2,
    description: "수도를 포함해 3번째 도시를 지을 수 있다.",
    passiveEffects: { /* 3도시 제한 해제 플래그 (스토어 처리) */ }
  },
  {
    id: 'printing_press', name: '인쇄기', level: 2,
    description: "해제 건물: 대학\n배치제한: 4\n문화 5개 소모해 화폐 토큰 1개 추가 (최대 4)",
    unlocksBuildings: ['university'], upgradesBuilding: { from: 'library', to: 'university' },passiveEffects: { stackingLimitBonus: 2 /* 기본2+2=4 */ }, resourceAbility: { description: "문화 5 소모 -> 화폐 토큰 +1", maxTokens: 4 }
  },
  {
    id: 'civil_service', name: '공공서비스', level: 2,
    description: "이벤트카드 제한 +1\n언제든: 스파이 1개 소모해 문화이벤트 카드 1개 무효화",
    passiveEffects: { cultureCardLimitBonus: 1 }, resourceAbility: { description: "스파이 1개 소모 -> 이벤트 카드 무효화 (언제든)" }
  },
  {
    id: 'democracy', name: '민주주의', level: 2,
    description: "해제 정치체제: 민주주의\n보병 2단계 (민병대->검사)\n도시경영: 교역 6 내고 화폐 토큰 1개 추가 (최대 4)",
    unlocksGovernment: 'democracy', upgradesUnit: { from: 'militia', to: 'swordsman' }, resourceAbility: { description: "교역 6 소모 -> 화폐 토큰 +1", maxTokens: 4 }
  },
  {
    id: 'chivalry', name: '기사도', level: 2,
    description: "해제 정치체제: 봉건제\n기병 2단계 (기마병->기사)\n도시경영: 향 1개 소모해 문화 토큰 5개 획득",
    unlocksGovernment: 'feudalism', upgradesUnit: { from: 'horseman', to: 'knight' }, resourceAbility: { description: "향 1개 소모 -> 문화 5 획득" }
  },
  {
    id: 'monarchy', name: '군주제', level: 2,
    description: "해제 정치체제: 군주제\n도시경영: 비단 1개 소모해 불가사의 무효화 또는 상대 부대카드 1장 무작위 제거",
    unlocksGovernment: 'monarchy', resourceAbility: { description: "비단 1개 소모 -> 불가사의 무효 또는 부대카드 1장 제거" }
  },
  {
    id: 'mathematics', name: '수학', level: 2,
    description: "궁병 2단계 (투석기->대포)\n전투 시: 철 1개 소모해 부상 3을 적 부대에 나누어 입힘",
    upgradesUnit: { from: 'catapult', to: 'cannon' }, resourceAbility: { description: "철 1개 소모 -> 전투 시 부상 3 입힘" }
  },
  {
    id: 'navigation', name: '범선항해술', level: 2,
    description: "이동 속도: 4\n물에서 이동을 마칠 수 있다.",
    passiveEffects: { movementBonus: 2, waterMovement: true, waterStop: true }
  },
  {
    id: 'engineering', name: '공학', level: 2,
    description: "건물 개량: 곡물창고->수로교\n생산력을 나누어 2개 물품 생산 가능",
    upgradesBuilding: { from: 'granary', to: 'aqueduct' }, resourceAbility: { description: "생산력 분할 생산 (패시브성)" }
  },

  // ================= [3레벨 기술] =================
  {
    id: 'theology', name: '신학', level: 3,
    description: "건물 개량: 신전->대성당\n해제 정치체제: 근본주의\n이벤트카드 제한 +1",
    upgradesBuilding: { from: 'temple', to: 'cathedral' }, unlocksGovernment: 'fundamentalism', passiveEffects: { cultureCardLimitBonus: 1 }
  },
  {
    id: 'railroad', name: '철도', level: 3,
    description: "건물 개량: 작업장->철광\n기병 3단계 (기사->기갑병)",
    upgradesBuilding: { from: 'workshop', to: 'iron_mine' }, upgradesUnit: { from: 'knight', to: 'armor' }
  },
  {
    id: 'finance', name: '금융', level: 3,
    description: "건물 개량: 시장->은행\n도시경영: 밀 1개 소모해 도시 생산력 +7",
    upgradesBuilding: { from: 'market', to: 'bank' }, resourceAbility: { description: "밀 1개 소모 -> 도시 생산력 +7" }
  },
  {
    id: 'military_science', name: '군사학', level: 3,
    description: "건물 개량: 병영->사관학교\n보유 화폐 3개당 생산력 1 추가",
    upgradesBuilding: { from: 'barracks', to: 'military_academy' } // 스토어에서 화폐 비례 생산력 연산
  },
  {
    id: 'metallurgy', name: '금속주조', level: 3,
    description: "포병 3단계 (대포->야포)\n도시경영: 향료 1개 소모해 문화 7 획득",
    upgradesUnit: { from: 'cannon', to: 'artillery' }, resourceAbility: { description: "향료 1개 소모 -> 문화 7 획득" }
  },
  {
    id: 'communism', name: '공산주의', level: 3, isStartingTechFor: 'russia',
    description: "해제 정치체제: 공산주의\n이동: 스파이 1개 소모해 지목당한 상대방의 다음 턴이 끝날 때까지 해당 칸 유닛 이동 불가",
    unlocksGovernment: 'communism', resourceAbility: { description: "스파이 1개 소모 -> 상대 다음턴까지 한 칸 마비" }
  },
  {
    id: 'biology', name: '생물학', level: 3,
    description: "배치제한: 5\n전투 시: 한 번 부대 입은 부상 모두 치료",
    passiveEffects: { stackingLimitBonus: 3 }, resourceAbility: { description: "전투 시 -> 모든 부상 치료 (1회)" }
  },
  {
    id: 'gunpowder', name: '화약', level: 3,
    description: "보병 3단계 (검사->소총병)\n도시경영: 임의 자원 2개 소모해 불가사의 무효화 또는 건물 파괴",
    upgradesUnit: { from: 'swordsman', to: 'rifleman' }, resourceAbility: { description: "자원 2개 소모 -> 불가사의 무효 또는 건물 파괴" }
  },
  {
    id: 'steam_power', name: '증기력', level: 3,
    description: "이동 속도: 5\n도시경영: 비단 1개 소모해 한 칸의 모든 유닛을 물 칸으로 순간이동 (이번 차례 이동 불가)",
    passiveEffects: { movementBonus: 3 }, resourceAbility: { description: "비단 1개 소모 -> 물 타일로 전체 순간이동" }
  },

  // ================= [4레벨 기술] =================
  {
    id: 'replaceable_parts', name: '교체부품', level: 4,
    description: "배치제한: 6\n보병 4단계 (소총병->현대 보병)",
    passiveEffects: { stackingLimitBonus: 4 }, upgradesUnit: { from: 'rifleman', to: 'modern_infantry' }
  },
  {
    id: 'ballistics', name: '탄도학', level: 4,
    description: "포병 4단계 (야포->로켓포)\n전투 시: 철 1개 소모해 부상 6을 적에게 나누어 입힘",
    upgradesUnit: { from: 'artillery', to: 'rocket_artillery' }, resourceAbility: { description: "철 1개 소모 -> 전투 시 부상 6 입힘" }
  },
  {
    id: 'computers', name: '컴퓨터', level: 4,
    description: "자기가 보유한 화폐 5개마다 문화이벤트 제한 +1 및 부대 카드 패 한도 +1",
    passiveEffects: { /* 스토어에서 동적 계산 */ }
  },
  {
    id: 'mass_media', name: '대중매체', level: 4,
    description: "내 이벤트 카드를 상대가 무효화 불가\n언제든: 스파이 1개 소모해 상대 자원 능력 무효화 및 자원 버림",
    resourceAbility: { description: "스파이 1 소모 -> 상대 자원 능력 무효 및 자원 파괴" }
  },
  {
    id: 'atomic_theory', name: '원자론', level: 4,
    description: "도시경영: 우라늄 1개 소모해 모든 도시 행동 1번 추가\n이동: 우라늄 1개 소모해 핵 공격 (수도 제외, 모든 것 파괴)",
    resourceAbility: { description: "우라늄 1 소모 -> 추가 행동 또는 핵 공격" }
  },
  {
    id: 'combustion', name: '연소', level: 4,
    description: "이동: 건물 위에서 이동 마치면 건물 파괴. 성벽 있는 도시 공격 시 성벽 파괴.\n기병 4단계 (기갑병->탱크)",
    upgradesUnit: { from: 'armor', to: 'tank' }
  },
  {
    id: 'flight', name: '비행', level: 4,
    description: "이동 속도: 6\n해제 부대: 공군\n물 패널티 없음, 적 유닛/지형 무시 이동",
    passiveEffects: { movementBonus: 4, ignoreTerrain: true }
  },

  // ================= [5레벨 기술 (승리 조건)] =================
  {
    id: 'space_flight', name: '우주비행', level: 5,
    description: "기술 승리 달성!",
  }
];