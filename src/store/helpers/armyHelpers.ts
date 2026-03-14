// src/store/helpers/armyHelpers.ts

export type StatProfile = 'defensive' | 'balanced' | 'offensive';

export function generateArmyStats(tier: number, existingProfile?: StatProfile): { attack: number; maxHealth: number; profile: StatProfile } {
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