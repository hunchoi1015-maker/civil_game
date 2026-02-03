# Project: 문명 - 턴제 전략 보드게임

> Civilization-style turn-based strategy board game built as a web application.

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | 5.9.3 |
| UI Framework | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| State Management | Zustand + Immer | 5.0.10 / 11.1.3 |
| Styling | Tailwind CSS | 4.1.18 |
| Routing | React Router | 7.13.0 |
| Animation | Framer Motion | 12.29.0 |
| Drag & Drop | React DnD (HTML5) | 16.0.1 |
| Linting | ESLint | 9.39.1 |
| Runtime | Node.js | 20.19+ |

## Architecture

### Directory Structure

```
src/
├── main.tsx                # Entry point
├── App.tsx                 # Router setup
├── pages/                  # Route-level screens
├── components/
│   ├── game/               # Game-specific UI components
│   │   ├── City/           # City management UI
│   │   ├── Map/            # Map grid & tiles
│   │   ├── Units/          # Unit panel
│   │   ├── Combat/         # Combat panel
│   │   ├── Tech/           # Tech tree
│   │   └── Trade/          # Trade panel
│   ├── layout/             # Layout wrappers
│   ├── phases/             # Phase-specific UI
│   └── ui/                 # Generic reusable UI
├── store/
│   └── gameStore.ts        # Monolithic Zustand store
├── engine/                 # Pure game logic (no UI dependency)
│   ├── GameEngine.ts       # Phase management, victory conditions
│   ├── ResourceCalculator.ts # Resource & production calculations
│   ├── CombatResolver.ts   # Combat mechanics
│   ├── MapGenerator.ts     # Map generation
│   └── TechValidator.ts    # Tech prerequisite validation
├── types/                  # TypeScript type definitions
├── constants/              # Game data (buildings, techs, nations, etc.)
├── hooks/                  # Custom React hooks
└── assets/                 # Static assets
```

### Key Patterns

- **Engine/UI Separation**: Game logic lives in `engine/` as pure functions, decoupled from React. The store calls engine functions, and components read from the store.
- **Monolithic Zustand Store**: Single store (`gameStore.ts`) holds all game state and actions. Uses Immer middleware for immutable state updates.
- **Phase-Based Game Flow**: Game progresses through sequential phases — `start` → `trade` → `cityManagement` → `movement` → `research`. Some phases are simultaneous (all players act), others are sequential (one player at a time).
- **Constants-Driven Design**: Game data (buildings, technologies, army cards, governments, nations) is defined in `constants/` files, not hardcoded in components.
- **Feature-Grouped Components**: Components under `components/game/` are grouped by game feature (City, Map, Units, Combat, Tech).

### State Flow

```
User Action → Store Action (Zustand) → Engine Logic → State Update (Immer) → React Re-render
```

## Coding Conventions

### Naming

| Target | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase | `PlayerPanel`, `GameScreen` |
| Functions | camelCase | `calculateTradeIncome`, `checkVictoryConditions` |
| Types/Interfaces | PascalCase | `GameState`, `Player`, `City` |
| Constants | UPPER_SNAKE_CASE | `MAX_CITIES`, `CAPITAL_BASE_COMBAT_BONUS` |
| Files (components) | PascalCase | `GameScreen.tsx`, `PlayerPanel.tsx` |
| Files (logic/types) | camelCase | `gameStore.ts`, `game.ts` |

### TypeScript

- **Strict mode** enabled (`strict: true`)
- Path alias: `@/*` → `src/*`
- All functions and parameters are explicitly typed
- Types are organized by domain in `types/` directory
- JSX transform: `react-jsx` (no manual `import React`)

### Imports

```typescript
// React (only when hooks/types needed)
import { useState, useEffect } from 'react';

// Store
import { useGameStore } from '../../store/gameStore';

// Types (from barrel export)
import { Player, GameState } from '../../types';

// Constants
import { BUILDINGS } from '../../constants/buildings';

// Path alias also available
import { useGameStore } from '@/store/gameStore';
```

### Styling

- Tailwind CSS utility classes exclusively (no CSS modules or styled-components)
- Dark theme: `slate-950` backgrounds, `slate-100` text, `amber` accents
- Minimal custom CSS (only scrollbar styling in `index.css`)

### Language

- **UI text**: Korean (한국어)
- **Code comments**: Korean for domain logic explanations
- **Code identifiers**: English

## Game Domain

### Core Entities

- **Player**: 2-4 players, each with a nation, government, resources, cities, and units
- **Nation**: 6 nations (America, Rome, Egypt, China, Russia, Germany) with unique bonuses
- **City**: Max 3 per player, 8 building slots, production from surrounding tiles
- **Unit**: Military and settler units with movement and combat strength
- **Technology**: 5-level pyramid tech tree (~50 techs)
- **Army Card**: Tiered combat cards (Infantry, Artillery, Cavalry, Airforce) with rock-paper-scissors advantages
- **Government**: 6 types affecting resource generation

### Victory Conditions

1. **Science** — Research Space Flight technology
2. **Culture** — Accumulate 20 culture points
3. **Economic** — Accumulate 15 currency
4. **Military** — Eliminate all opponents' capitals
