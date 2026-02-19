import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameStore } from '../types/storeTypes';
import { getNextStepCost, GREAT_PERSON_SPOTS, CULTURE_TRACK_MAX } from '../../constants/culture';
import { getSurroundingPositions } from '../helpers/mapHelpers';

export interface CultureSlice {
  advanceCultureTrack: () => void;
  placeGreatPerson: (tilePos: { x: number, y: number }) => void;
}

export const createCultureSlice: StateCreator<GameStore, [["zustand/immer", never]], [], CultureSlice> = (set, get) => ({
  advanceCultureTrack: () => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      const currentTrack = player.cultureTrack;

      // 1. 최대 레벨 도달 시 (승리 조건은 별도 체크하거나 여기서 처리)
      if (currentTrack >= CULTURE_TRACK_MAX) return;

      // 2. 비용 확인
      const cost = getNextStepCost(currentTrack);
      if (player.resources.culture < cost.culture || player.resources.trade < cost.trade) {
        alert("자원이 부족합니다.");
        return;
      }

      // 3. 자원 소모 및 전진
      player.resources.culture -= cost.culture;
      player.resources.trade -= cost.trade;
      player.cultureTrack += 1;
      const newTrack = player.cultureTrack;

      // 4. 보상 지급
      if (GREAT_PERSON_SPOTS.includes(newTrack)) {
        // 위인 획득 -> 배치 모드 활성화
        player.greatPeople += 1; // 수치 증가
        player.pendingGreatPerson = true; // 배치 대기 상태
        alert("위인이 탄생했습니다! 도시 주변에 배치하세요.");
      } else {
        // 문화 이벤트 카드 획득 (단순 구현: 메시지만 표시하거나 더미 카드 추가)
        const level = getNextStepCost(currentTrack).culture === 3 ? 1 : (getNextStepCost(currentTrack).culture === 5 ? 2 : 3);
        const newCard = {
            id: uuidv4(),
            level: level as 1|2|3,
            name: `문화 이벤트 (Lv.${level})`,
            description: "추후 구현될 기능입니다.",
            effect: () => {} 
        };
        player.cultureEventCards.push(newCard);
        // alert(`문화 이벤트 카드(Lv.${level})를 획득했습니다!`);
      }

      // 5. 승리 체크
      if (newTrack === CULTURE_TRACK_MAX) {
        state.winner = player.id;
        state.winCondition = 'culture';
        state.isGameOver = true;
      }
    });
  },

  placeGreatPerson: (tilePos) => {
    set((state) => {
      const player = state.players[state.currentPlayerIndex];
      if (!player.pendingGreatPerson) return;

      // 유효성 검사: 본인 도시 주변 8칸, 물 아님, 건물 없음
      const tile = state.map.tiles[tilePos.y][tilePos.x];
      
      // 1. 물 타일 제외
      if (tile.terrain === 'water') {
          alert("물 타일에는 배치할 수 없습니다.");
          return;
      }
      // 2. 건물 존재 여부
      if (tile.buildingType) {
          alert("이미 건물이 있는 곳에는 배치할 수 없습니다.");
          return;
      }
      
      // 3. 내 도시 주변 8칸 확인
      let nearMyCity = false;
      for (const city of player.cities) {
          const surrounding = getSurroundingPositions(city.position, state.map.width, state.map.height);
          // 도시 중심 포함? (보통 중심에는 이미 건물이 있으니 제외됨)
          if (surrounding.some(p => p.x === tilePos.x && p.y === tilePos.y)) {
              nearMyCity = true;
              break;
          }
      }

      if (!nearMyCity) {
          alert("자신의 도시 주변 8칸 이내에만 배치할 수 있습니다.");
          return;
      }

      // 배치 성공: 여기서는 건물을 짓는 대신 '위인 객체'를 타일에 심거나, 
      // 기획상 '위인'이 건물 취급인지, 유닛 취급인지, 타일 부착물인지에 따라 다름.
      // "위인을 타일에 배치" -> 보통 문화유산(Great Work) 같은 개념이라면 buildingType을 사용하거나
      // tile.object (오두막/마을용)를 재활용하거나 새로 필드를 파야 함.
      // **제안:** tile.buildingType = 'great_work' (건물로 취급) 또는 tile.object에 추가.
      // 여기서는 타일의 `object` 필드를 활용하겠습니다. (오두막/마을과 같은 레이어)
      
      state.map.tiles[tilePos.y][tilePos.x].object = {
          type: 'great_person_site', // 타입 추가 필요
          reward: { type: 'greatPerson' } // 더미 데이터
      } as any; // 타입 임시 우회 (나중에 map.ts 수정 필요)

      player.pendingGreatPerson = false;
    });
  }
});