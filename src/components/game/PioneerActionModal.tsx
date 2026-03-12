// src/components/game/PioneerActionModal.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { calculateTileYield } from '../../engine/ResourceCalculator'; // 🌟 타일 산출량 계산 함수 임포트

interface PioneerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PioneerActionModal: React.FC<PioneerActionModalProps> = ({ isOpen, onClose }) => {
  const { players, currentPlayerIndex, sendPioneerTileToCity, map } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];

  const [selectedPioneerId, setSelectedPioneerId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedPioneerId('');
      setSelectedCityId('');
    }
  }, [isOpen]);

  if (!isOpen || !currentPlayer) return null;

  const isOutskirts = (pos: { x: number; y: number }) => {
    return !players.some(p =>
      p.cities.some(c =>
        Math.abs(c.position.x - pos.x) <= 1 && Math.abs(c.position.y - pos.y) <= 1
      )
    );
  };

  // 교외 반경 계산을 통과한 개척자 필터링
  const rawAvailablePioneers = currentPlayer.units.filter(
    (u) => u.type === 'settler' && isOutskirts(u.position)
  );

  // 🌟 [수정 3] 중복 위치 제거: 같은 좌표에 개척자가 여러 명이면 하나만 남김
  const availablePioneers = rawAvailablePioneers.filter((u, index, self) =>
    index === self.findIndex((t) => (
      t.position.x === u.position.x && t.position.y === u.position.y
    ))
  );

  const cities = currentPlayer.cities;

  const handleConfirm = () => {
    if (selectedPioneerId && selectedCityId) {
      sendPioneerTileToCity(selectedPioneerId, selectedCityId);
      onClose();
    }
  };

  return (
    // 🌟 [수정 1] 배경 까만색 문제 해결: bg-black/50 와 backdrop-blur-sm 사용
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full text-gray-800">
        <h2 className="text-xl font-bold mb-4 text-center">⛺ 개척자 보급 스킬</h2>
        
        {availablePioneers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">현재 교외에 위치한 개척자가 없습니다.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded w-full font-semibold"
            >
              닫기
            </button>
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">보급을 받을 도시가 아직 없습니다.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded w-full font-semibold"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              개척자가 밟고 있는 타일의 자원(생산력/교역력)을 도시로 전송합니다. <br/>
              <span className="text-blue-500 font-semibold">* 이 스킬은 이동력을 소모하지 않습니다.</span>
            </p>

            {/* 개척자 선택 */}
            <div>
              <label className="block text-sm font-bold mb-1">사용할 개척자 타일(자원) 선택</label>
              <select
                className="w-full border p-2 rounded bg-gray-50"
                value={selectedPioneerId}
                onChange={(e) => setSelectedPioneerId(e.target.value)}
              >
                <option value="" disabled>보급할 타일을 선택하세요</option>
                {availablePioneers.map((pioneer) => {
                  // 🌟 [수정 2] 해당 타일의 실제 산출량 계산
                  const tile = map.tiles[pioneer.position.y][pioneer.position.x];
                  const yields = calculateTileYield(tile, players);
                  const resText = tile.resource && tile.resource !== 'none' ? `, 💎사치품: ${tile.resource}` : '';
                  
                  return (
                    <option key={pioneer.id} value={pioneer.id}>
                      보급품 (생산+{yields.production}, 교역+{yields.trade}{resText})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 도시 선택 */}
            <div>
              <label className="block text-sm font-bold mb-1">보급받을 도시 선택</label>
              <select
                className="w-full border p-2 rounded bg-gray-50"
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
              >
                <option value="" disabled>도시를 선택하세요</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} (위치: x:{city.position.x}, y:{city.position.y})
                  </option>
                ))}
              </select>
            </div>

            {/* 버튼 영역 */}
            <div className="flex space-x-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedPioneerId || !selectedCityId}
                className={`flex-1 px-4 py-2 rounded font-semibold text-white transition-colors ${
                  !selectedPioneerId || !selectedCityId
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                스킬 사용
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};