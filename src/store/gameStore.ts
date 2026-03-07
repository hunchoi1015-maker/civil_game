import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GameStore } from './types/storeTypes';
import { Position, GameConfig, Player, GameMap, GamePhase } from '../types';

// Slices Import
import { createGameSetupSlice } from './slices/gameSetupSlice';
import { createTurnManagementSlice } from './slices/turnManagementSlice';
import { createPlayerSlice } from './slices/playerSlice';
import { createCitySlice } from './slices/citySlice';
import { createUnitSlice } from './slices/unitSlice';
import { createCombatSlice } from './slices/combatSlice';
import { createTechSlice } from './slices/techSlice';
import { createUISlice } from './slices/uiSlice';
import { createCultureSlice } from './slices/cultureSlice';
import { createInterruptSlice, InterruptSlice } from './slices/interruptSlice';

// Helpers Import
import { getTileSafe } from './helpers/mapHelpers';
import { canPerformActionInPhase } from './helpers/validationHelpers';

/**
 * 초기 상태 생성 함수
 * 타입 호환성을 위해 명시적 타입 캐스팅(as)을 사용합니다.
 */
const createInitialState = () => ({
  id: '',
  turn: 0,
  // 리터럴 'start'가 아닌 GamePhase 타입임을 명시
  currentPhase: 'start' as GamePhase, 
  currentPlayerIndex: 0,
  firstPlayerIndex: 0,
  players: [] as Player[],
  map: { width: 0, height: 0, tiles: [] } as GameMap,
  winner: null,
  winCondition: null,
  isGameOver: false,
  phaseComplete: [] as boolean[],
  interruptState: {
    actionStack: [],
    respondersQueue: [],
    currentResponderId: null,
    timerEndsAt: null,
  },
  marketResources: {
    spice: 0,
    wheat: 0,
    silk: 0,
    iron: 0,
  },
});

export const useGameStore = create<GameStore>()(
  immer((...a) => {
    // a[0] = set, a[1] = get, a[2] = store
    const [set, get] = a;

    return {
      // 1. 초기 상태 주입
      ...createInitialState(),

      // 2. 각 슬라이스 기능 통합
      ...createGameSetupSlice(...a),
      ...createTurnManagementSlice(...a),
      ...createPlayerSlice(...a),
      ...createCitySlice(...a),
      ...createUnitSlice(...a),
      ...createCombatSlice(...a),
      ...createTechSlice(...a),
      ...createUISlice(...a),
      ...createCultureSlice(...a),
      ...createInterruptSlice(...a),
      // 3. 메인 스토어 전용 메서드 (슬라이스에 속하지 않는 공통 로직)

      // 게임 초기화: Setup 슬라이스의 initSetup 호출
      initGame: (config: GameConfig) => {
        get().initSetup(config.playerCount, config.playerNames);
      },

      // 게임 리셋: 초기 상태로 복구
      resetGame: () => {
        set(createInitialState());
      },

      // 맵 타일 조회 헬퍼
      getTile: (position: Position) => {
        const { map } = get();
        return getTileSafe(map, position);
      },

      // 타일 소유자 변경 (직접 상태 수정)
      setTileOwner: (position: Position, ownerId: string | null) => {
        set((state) => {
          const tile = state.map.tiles[position.y]?.[position.x];
          if (tile) {
            tile.ownerId = ownerId;
          }
        });
      },

      // 현재 페이즈에 따른 액션 수행 가능 여부 확인
      canPerformAction: (action) => {
        const { currentPhase } = get();
        return canPerformActionInPhase(action, currentPhase);
      },

      // 승리 조건 체크 로직
      checkVictory: () => {
        set((state) => {
          // 이미 게임이 끝났으면 로직 수행 안 함
          if (state.isGameOver) return;

          const { players } = state;
          
          for (const player of players) {
            if (player.isEliminated) continue;

            // 1. 과학 승리: 우주 비행 기술 연구
            if (player.technologies.some((t) => t.id === 'space_flight')) {
              state.winner = player.id;
              state.winCondition = 'science';
              state.isGameOver = true;
              return;
            }

            // 2. 경제 승리: 화폐 자원 15 이상
            if (player.resources.currency >= 15) {
              state.winner = player.id;
              state.winCondition = 'economic';
              state.isGameOver = true;
              return;
            }

            // 3. 문화 승리: 문화 트랙 20 도달
            if (player.cultureTrack >= 20) {
              state.winner = player.id;
              state.winCondition = 'culture';
              state.isGameOver = true;
              return;
            }
          }

          // 4. 군사 승리: 다른 모든 플레이어가 제거됨
          const activePlayers = players.filter((p) => !p.isEliminated);
          if (activePlayers.length === 1) {
            state.winner = activePlayers[0].id;
            state.winCondition = 'military';
            state.isGameOver = true;
          }
        });
      },
    };
  })
);