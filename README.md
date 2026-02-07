# Civil Game - 문명 전략 보드게임

> React + TypeScript 기반의 턴제 전략 보드게임

## 🎮 게임 소개

Civil Game은 문명(Civilization) 시리즈에서 영감을 받은 턴제 전략 보드게임입니다. 플레이어는 국가를 선택하고 수도를 건설하여, 기술 연구, 도시 관리, 군사 전략을 통해 승리 조건을 달성합니다.

### 주요 특징

- **다양한 승리 조건**: 과학, 문화, 경제, 군사 승리 중 선택
- **6개 국가**: 미국, 로마, 이집트, 중국, 러시아, 독일 (각각 고유 능력)
- **5단계 기술 트리**: 고대부터 현대까지 24개 기술 연구
- **전략적 전투 시스템**: 부대 카드 기반 전투 (보병/포병/기병/공군 상성)
- **도시 경영**: 건물 건설, 자원 생산, 영토 확장
- **정부 체제**: 6가지 정치 체제 선택 (전제정, 군주정, 민주정 등)

## 🚀 시작하기

### 필요 사항

- Node.js 18.x 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/hunchoi1015-maker/civil_game.git
cd civil_game

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

### 기술 스택

- **Frontend**: React 18, TypeScript
- **상태 관리**: Zustand (Immer 미들웨어)
- **라우팅**: React Router v7
- **스타일링**: Tailwind CSS
- **빌드 도구**: Vite
- **유틸리티**: UUID (고유 ID 생성)

## 🎯 게임 규칙

### 게임 진행

게임은 **5단계 턴 시스템**으로 진행됩니다:

1. **차례 시작 (Start)**: 정부 체제 변경
2. **교역 (Trade)**: 교역 수입 수령 및 자원 교환
3. **도시 경영 (City Management)**: 건물/유닛 생산, 문화 수확
4. **이동 (Movement)**: 유닛 이동 및 전투
5. **연구 (Research)**: 기술 연구

모든 단계는 **순차 진행**되며, 선플레이어부터 순서대로 행동합니다.

### 승리 조건

- **과학 승리**: 5단계 기술 "우주 비행" 연구
- **문화 승리**: 문화 트랙 20 달성
- **경제 승리**: 화폐 15개 획득
- **군사 승리**: 적 수도 점령 또는 모든 적 제거

### 국가 특성

#### 🇺🇸 미국 (America)
**시작 보너스:**
- 위인 1개 획득
- 연구 '통화' 해금
- 정치체제 '전제정치'로 시작

**특수 능력:**
- 도시경영 단계에서 교역 자원 3개를 소모하여 특정 도시에 생산력 2를 얻음 (1턴 반복 가능)

---

#### 🏛️ 로마 (Rome)
**시작 보너스:**
- 연구 '법계' 해금
- 정치체제 '전제정치'로 시작

**특수 능력:**
- '마을'과의 전투 승리 시 문화 +1
- 도시 건설 시 문화 +1
- 불가사의 건설 시 문화 +1
- 도시 파괴 시 문화 +1
- 도시경영 단계에서 교역 3 소모 → 생산력 1 획득 (1턴 반복 가능)

---

#### 🏺 이집트 (Egypt)
**시작 보너스:**
- 불가사의 1개 획득
- 연구 '건설' 해금
- 정치체제 '전제정치'로 시작

**특수 능력:**
- 도시경영 단계에서 행동 소모하여 해금된 건물을 **생산력 없이** 건설 가능 (매 턴 1회)
- 도시경영 단계에서 교역 3 소모 → 생산력 1 획득 (1턴 반복 가능)

---

#### 🐉 중국 (China)
**시작 보너스:**
- 수도에 성벽 건설 완료
- 연구 '00' 해금
- 정치체제 '전제정치'로 시작

**특수 능력:**
- '오두막' 또는 '마을' 획득 시 문화 3 획득
- 도시경영 단계에서 교역 3 소모 → 생산력 1 획득 (1턴 반복 가능)

---

#### 🐻 러시아 (Russia)
**시작 보너스:**
- 군대 유닛 1개 추가 (총 2개로 시작)
- 군대 유닛 제한 7개 (기본 6개 + 1)
- 배치 제한 +1
- 연구 '공산주의' 해금
- 정치체제 '공산주의'로 시작

**특수 능력:**
- 이동 단계에서 개척자/군대 유닛을 적 도시/수도로 이동 시:
  - 전투를 벌이거나
  - 유닛을 소모하여 상대의 연구 기술 1개를 복사 (기술 피라미드 준수)
- 도시경영 단계에서 교역 3 소모 → 생산력 1 획득 (1턴 반복 가능)

---

#### ⚙️ 독일 (Germany)
**시작 보너스:**
- 보병 부대 카드 2장 획득
- 연구 '금속가공' 해금
- 정치체제 '전제정치'로 시작

**특수 능력:**
- 연구 단계에서 부대 진급 관련 기술 해금 시 해당 부대 카드 1장 획득
- 도시경영 단계에서 교역 3 소모 → 생산력 1 획득 (1턴 반복 가능)

---

### 교역-생산력 교환 시스템

**미국을 제외한 모든 국가:**
- 도시경영 단계에서 교역 자원 3개를 소모하여 특정 도시에 생산력 1을 부여
- 1턴에 반복 사용 가능
- 즉시 사용 가능 (해당 턴 도시 생산에 적용)

**미국:**
- 동일한 방식으로 생산력 **2**를 획득 (교역 3 → 생산력 2)

## 🏗️ 프로젝트 구조

```
civil_game/
├── src/
│   ├── components/       # React 컴포넌트
│   │   └── game/         # 게임 UI 컴포넌트
│   │       ├── Map/      # 맵 렌더링 (MapGrid, TileComponent)
│   │       ├── Combat/   # 전투 UI (CombatPanel)
│   │       ├── City/     # 도시 관리 (CityPanel)
│   │       ├── Tech/     # 기술 트리 (TechTree)
│   │       └── Units/    # 유닛 패널 (UnitPanel)
│   ├── engine/           # 게임 로직 엔진
│   │   ├── GameEngine.ts          # 턴 관리, 승리 조건
│   │   ├── CombatResolver.ts      # 전투 해결 알고리즘
│   │   ├── MapGenerator.ts        # 맵 생성 (16x16)
│   │   ├── ResourceCalculator.ts  # 자원 산출 계산
│   │   └── TechValidator.ts       # 기술 연구 검증
│   ├── store/            # Zustand 상태 관리
│   │   └── gameStore.ts  # 전역 게임 상태
│   ├── types/            # TypeScript 타입 정의
│   │   ├── game.ts       # 게임 상태, 턴 단계
│   │   ├── player.ts     # 플레이어, 자원
│   │   ├── combat.ts     # 전투, 부대 카드
│   │   ├── city.ts       # 도시, 건물
│   │   ├── unit.ts       # 유닛 (군사, 개척자)
│   │   ├── tech.ts       # 기술
│   │   ├── map.ts        # 타일, 지형
│   │   └── nation.ts     # 국가
│   ├── constants/        # 게임 데이터
│   │   ├── technologies.ts   # 24개 기술 정의
│   │   ├── armyCards.ts      # 16개 부대 카드 (4 티어 × 4 병종)
│   │   ├── buildings.ts      # 8개 건물 정의
│   │   └── governments.ts    # 6개 정부 체제
│   ├── pages/            # 라우트 페이지
│   │   ├── MainMenu.tsx       # 메인 메뉴
│   │   ├── GameSetup.tsx      # 게임 설정
│   │   ├── GameScreen.tsx     # 게임 플레이 화면
│   │   └── RulesPage.tsx      # 규칙 설명
│   ├── App.tsx           # React Router 설정
│   └── main.tsx          # 앱 진입점
├── public/               # 정적 파일
├── package.json          # 의존성
├── tsconfig.json         # TypeScript 설정
└── vite.config.ts        # Vite 설정
```

## 🎲 핵심 시스템

### 1. 전투 시스템

부대 카드 기반 전투:
- **병종 상성**: 포병 → 보병, 기병 → 포병, 보병 → 기병 (선제공격)
- **공군**: 무상성 (모든 병종에 동시 공격)
- **전투력**: 공격력 + 체력 조합 (티어별 4/6/8/10)
- **전장 배치**: 최대 6장 제한 (유닛 수 또는 도시 기준)
- **승리 보너스**: 전리품 (교역 또는 문화) 획득

### 2. 기술 연구

피라미드 구조:
- **레벨 1 (고대)**: 5개 기술, 비용 6
- **레벨 2 (고전)**: 4개 기술, 비용 11
- **레벨 3 (중세)**: 4개 기술, 비용 15
- **레벨 4 (산업)**: 4개 기술, 비용 21
- **레벨 5 (현대)**: 4개 기술, 비용 26

상위 레벨 연구를 위해 하위 레벨 기술이 (레벨 - 1)개 필요

### 3. 도시 관리

- **건물 건설**: 턴당 1회, 생산력 소모
- **자원 생산**: 교역, 생산, 문화
- **영토 확장**: 도시 주변 8칸 자동 소유
- **건물 종류**: 성벽, 막사, 도서관, 대학교, 시장, 은행, 사원, 대성당

### 4. 맵 시스템

- **크기**: 16×16 표준 맵
- **지형**: 초원, 숲, 산, 사막, 물
- **자원**: 밀, 철, 금, 비단, 향료, 향신료
- **가시성**: 전체 맵 공개 (탐험 시스템 없음)

## 📊 게임 밸런스

### 자원 제한

- **교역 상한**: 27
- **도시 수**: 최대 3개
- **군사 유닛**: 최대 6개 (러시아는 7개)
- **개척자**: 최대 2개
- **부대 카드**: 제한 없음 (생산력에 따라)

### 생산 비용

| 항목 | 비용 |
|------|------|
| 부대 카드 (모든 티어) | 생산 2 |
| 일반 건물 | 생산 4 |
| 고급 건물 | 생산 6-8 |
| 기술 (레벨 1-5) | 교역 6-26 |

## 🔧 개발 가이드

### 상태 관리

Zustand + Immer를 사용한 불변성 관리:

```typescript
// gameStore.ts 예시
set((state) => {
  state.turn += 1;
  state.currentPhase = 'start';
});
```

### 새 기능 추가

1. **타입 정의**: `src/types/` 에 인터페이스 추가
2. **상수 정의**: `src/constants/` 에 게임 데이터 추가
3. **로직 구현**: `src/engine/` 에 계산 함수 추가
4. **스토어 연동**: `src/store/gameStore.ts` 에 액션 추가
5. **UI 구현**: `src/components/` 에 컴포넌트 추가

### 테스트

```bash
# 개발 전투 시뮬레이터
npm run dev
# 브라우저에서 /dev/combat-sim 접속
```

## 📝 버전 히스토리

### v1.0.0 (현재)
- ✅ 기본 게임 메커니즘 구현
- ✅ 5단계 턴 시스템
- ✅ 전투 시스템 (부대 카드, 상성, 전장)
- ✅ 기술 트리 (24개 기술, 5레벨)
- ✅ 도시 관리 (8개 건물)
- ✅ 6개 국가, 6개 정부 체제
- ✅ 4가지 승리 조건
- ✅ 16×16 맵 생성

### 향후 계획
- 🔄 위인 시스템 구현
- 🔄 마을/오두막 시스템 구현
- 🔄 불가사의 시스템 구현
- 🔄 멀티플레이어 지원 (네트워크)
- 🔄 AI 플레이어
- 🔄 추가 국가 및 기술
- 🔄 맵 에디터
- 🔄 캠페인 모드

## 🤝 기여하기

이슈 제보, 기능 제안, 풀 리퀘스트를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 👥 제작자

- **개발자**: hunchoi1015-maker
- **GitHub**: https://github.com/hunchoi1015-maker/civil_game

## 🙏 감사의 말

- Civilization 시리즈의 영감
- React 및 TypeScript 커뮤니티
- Zustand 상태 관리 라이브러리

---

**즐거운 게임 되세요! 🎮**

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
