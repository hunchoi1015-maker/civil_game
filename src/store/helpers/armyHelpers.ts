// src/store/helpers/armyHelpers.ts 파일을 새로 만들어주세요.

export type StatProfile = 'defensive' | 'balanced' | 'offensive';

export function generateArmyStats(tier: number, existingProfile?: StatProfile): { attack: number; maxHealth: number; profile: StatProfile } {
    // 기존 성향이 있으면 그걸 쓰고, 없으면 3개 중 하나를 랜덤으로 부여합니다.
    const profile = existingProfile || (['defensive', 'balanced', 'offensive'][Math.floor(Math.random() * 3)] as StatProfile);
    
    let attack = 0;
    let maxHealth = 0;

    if (profile === 'defensive') {
        attack = tier;
        maxHealth = tier + 2;
    } else if (profile === 'balanced') {
        attack = tier + 1;
        maxHealth = tier + 1;
    } else if (profile === 'offensive') {
        attack = tier + 2;
        maxHealth = tier;
    }

    return { attack, maxHealth, profile };
}