import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

interface PioneerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PioneerActionModal: React.FC<PioneerActionModalProps> = ({ isOpen, onClose }) => {
  const { players, currentPlayerIndex, sendPioneerTileToCity } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];

  const [selectedPioneerId, setSelectedPioneerId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  // 모달이 열릴 때마다 선택 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedPioneerId('');
      setSelectedCityId('');
    }
  }, [isOpen]);

  if (!isOpen || !currentPlayer) return null;

  // 행동력이 남아있는 개척자(settler)만 필터링 (최대 2기)
  const availablePioneers = currentPlayer.units.filter(
    (u) => u.type === 'settler' && u.movement > 0
  );
  const cities = currentPlayer.cities;

  const handleConfirm = () => {
    if (selectedPioneerId && selectedCityId) {
      sendPioneerTileToCity(selectedPioneerId, selectedCityId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full text-gray-800">
        <h2 className="text-xl font-bold mb-4 text-center">⛺ 개척자 보급 스킬</h2>
        
        {availablePioneers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">현재 행동력이 남아있는 개척자가 없습니다.</p>
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
            <p className="text-sm text-gray-600 mb-2">
              개척자가 밟고 있는 타일의 자원(생산력/교역력)을 도시로 전송합니다. <br/>
              <span className="text-red-500 font-semibold">* 사용 시 해당 개척자의 행동력을 모두 소모합니다.</span>
            </p>

            {/* 개척자 선택 */}
            <div>
              <label className="block text-sm font-bold mb-1">사용할 개척자 선택</label>
              <select
                className="w-full border p-2 rounded bg-gray-50"
                value={selectedPioneerId}
                onChange={(e) => setSelectedPioneerId(e.target.value)}
              >
                <option value="" disabled>개척자를 선택하세요</option>
                {availablePioneers.map((pioneer, index) => (
                  <option key={pioneer.id} value={pioneer.id}>
                    개척자 {index + 1}호 (위치: x:{pioneer.position.x}, y:{pioneer.position.y})
                  </option>
                ))}
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