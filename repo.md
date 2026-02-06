civil_game/
├── .claude/                # Claude AI 연동 설정 및 자동화 스크립트
│   ├── commands/           # opsx 관련 명령어 정의 (apply, archive, sync 등)
│   └── skills/             # 특정 작업 수행을 위한 스킬 정의
├── .idx/                   # Project IDX 개발 환경 설정 (dev.nix, mcp.json 등)
├── openspec/               # 프로젝트의 기술 명세 및 설계 문서
│   ├── config.yaml         # 프로젝트 설정 메타데이터
│   └── project.md          # 상세 프로젝트 명세서
├── public/                 # 정적 에셋 및 라우팅 설정
│   ├── _routes.json        # 클라이언트 사이드 라우팅 설정
│   └── vite.svg            # Vite 아이콘
├── src/
│   ├── assets/             # 이미지 및 SVG 파일 (react.svg 등)
│   ├── components/
│   │   └── game/           # 게임 내 주요 UI 컴포넌트
│   │       ├── City/       # 도시 관리 및 건물 건설 관련 컴포넌트 (CityPanel.tsx)
│   │       ├── Combat/     # 전투 진행 및 결과 UI (CombatPanel.tsx)
│   │       ├── Map/        # 게임 보드 시각화 (MapGrid.tsx, TileComponent.tsx)
│   │       ├── Tech/       # 기술 트리 시각화 (TechTree.tsx)
│   │       ├── Units/      # 유닛 정보 및 명령 패널 (UnitPanel.tsx)
│   │       ├── ActionPanel.tsx       # 플레이어 행동 선택 패널
│   │       ├── ArmyCardsWidget.tsx   # 보유 군사 카드 목록 위젯
│   │       ├── CapitalSelectionScreen.tsx # 수도 선택 화면
│   │       ├── GovernmentPanel.tsx   # 정부 체제 변경 패널
│   │       ├── NationSelectionScreen.tsx # 국가 선택 화면
│   │       ├── PhaseIndicator.tsx    # 현재 턴 단계 표시기
│   │       ├── PlayerPanel.tsx       # 플레이어 자원 및 상태 정보창
│   │       ├── PlayerTransition.tsx  # 턴 교대 알림 화면
│   │       ├── ResearchResultsModal.tsx # 기술 연구 결과 모달
│   │       ├── TradePanel.tsx        # 교역 및 자원 교환 패널
│   │       └── VictoryModal.tsx      # 게임 승리/종료 모달
│   ├── constants/          # 게임의 고정 데이터 정의
│   │   ├── armyCards.ts    # 병종별 티어, 전투력, 상성 데이터
│   │   ├── buildings.ts    # 건물별 비용 및 효과 데이터
│   │   ├── governments.ts  # 정부 유형별 보너스 데이터
│   │   ├── technologies.ts # 기술 트리 및 연구 비용 데이터
│   │   └── index.ts        # 상수 통합 내보내기
│   ├── engine/             # 게임 핵심 비즈니스 로직 (연산 엔진)
│   │   ├── CombatResolver.ts     # 전투 상성 및 피해량 계산 로직
│   │   ├── GameEngine.ts         # 턴 관리, 승리 조건 체크, 단계 제어
│   │   ├── MapGenerator.ts       # 지형 생성 및 자원 배치 알고리즘
│   │   ├── ResourceCalculator.ts # 턴당 자원(교역, 생산, 문화) 산출 로직
│   │   ├── TechValidator.ts      # 기술 연구 선행 조건 검증
│   │   └── index.ts              # 엔진 모듈 통합 내보내기
│   ├── pages/              # 라우트별 주요 화면 구성
│   │   ├── GameScreen.tsx  # 실제 게임 플레이 메인 화면
│   │   ├── GameSetup.tsx   # 인원 및 맵 설정 화면
│   │   ├── MainMenu.tsx    # 게임 시작 메뉴 화면
│   │   └── RulesPage.tsx   # 게임 규칙 설명 화면
│   ├── store/              # 전역 상태 관리
│   │   └── gameStore.ts    # Zustand를 이용한 게임 상태(State) 저장소
│   ├── types/              # TypeScript 타입 정의 파일
│   │   ├── city.ts         # 도시 및 건물 구조체 타입
│   │   ├── combat.ts       # 전투 시스템 관련 타입
│   │   ├── game.ts         # 게임 전반(턴, 단계) 관련 타입
│   │   ├── map.ts          # 타일 및 지형 타입
│   │   ├── nation.ts       # 국가 특성 타입
│   │   ├── player.ts       # 플레이어 자원 및 정보 타입
│   │   ├── tech.ts         # 기술 연구 관련 타입
│   │   ├── unit.ts         # 군사 유닛 및 개척자 타입
│   │   └── index.ts        # 타입 통합 내보내기
│   ├── App.tsx             # React 라우터 설정 및 앱 최상위 컴포넌트
│   ├── index.css           # 글로벌 스타일 (Tailwind CSS 포함)
│   └── main.tsx            # 앱 진입점 (DOM 렌더링)
├── GAME_ELEMENTS_REPORT.md # 게임 시스템 및 수치 데이터 종합 보고서
├── IMPLEMENTATION_REPORT.md # 현재 기능 구현 현황 보고서
├── README.md               # 프로젝트 개요 및 설치 방법
├── package.json            # 프로젝트 의존성 및 스크립트 정의
├── tsconfig.json           # TypeScript 컴파일 설정
└── vite.config.ts          # Vite 빌드 및 플러그인 설정
