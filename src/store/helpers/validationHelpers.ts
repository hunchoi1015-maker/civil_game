// src/store/helpers/validationHelpers.ts

import { GamePhase } from '../../types';
import { Player } from '../../types/player';
import { NationType } from '../../types/nation';
import { TECHNOLOGIES } from '../../constants/technologies';

export function canPerformActionInPhase(action: 'research' | 'build' | 'move' | 'trade' | 'combat', currentPhase: GamePhase): boolean {
  switch (action) {
    case 'research': return currentPhase === 'research';
    case 'build': return currentPhase === 'cityManagement';
    case 'move': return currentPhase === 'movement';
    case 'trade': return currentPhase === 'trade';
    case 'combat': return currentPhase === 'movement';
    default: return false;
  }
}

// 🌟 [통합 1] 해당 국가에게 이 기술이 몇 단계로 취급되는지 반환
export function getEffectiveTechLevel(nation: NationType | string | undefined, techId: string): number {
    const tech = TECHNOLOGIES.find(t => t.id === techId);
    if (!tech) return 99;
    
    // 시작 기술이면 본인에게만 1단계로 취급
    if (tech.isStartingTechFor && tech.isStartingTechFor === nation) return 1;
    
    return tech.level;
}

// 🌟 [통합 2] 플레이어가 피라미드 규칙에 따라 이 기술을 배울 수 있는지 판별
export function canLearnTechInPyramid(player: Player, targetTechId: string): { canResearch: boolean, reason?: string } {
    const targetTech = TECHNOLOGIES.find(t => t.id === targetTechId);
    if (!targetTech) return { canResearch: false, reason: "존재하지 않는 기술입니다." };

    if (player.technologies.some(t => t.id === targetTechId)) {
        return { canResearch: false, reason: "이미 연구한 기술입니다." };
    }

    const targetLevel = getEffectiveTechLevel(player.nation, targetTechId);
    
    if (targetLevel === 1) return { canResearch: true };

    const currentLevelCount = player.technologies.filter(
        t => getEffectiveTechLevel(player.nation, t.id) === targetLevel
    ).length;
    
    const lowerLevelCount = player.technologies.filter(
        t => getEffectiveTechLevel(player.nation, t.id) === targetLevel - 1
    ).length;

    // 피라미드 공식
    if (lowerLevelCount >= currentLevelCount + 2) {
        return { canResearch: true };
    } else {
        return { 
            canResearch: false, 
            reason: `피라미드 조건 부족: ${targetLevel}레벨을 연구하려면 ${targetLevel - 1}레벨 기술이 최소 ${currentLevelCount + 2}개 필요합니다. (현재 ${lowerLevelCount}개)` 
        };
    }
}