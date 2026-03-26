import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Tower Balance",
    tagline: "A wobblier stacking challenge than Cube Stack Drop.",
    instructions: "Drop each block close to center. The stack sways more as it gets taller, so clean placement matters.",
    controls: "GO to place each segment",
    tip: "Quick scoring comes from consistency, not panic taps.",
    storageKey: "best_tower-balance",
    sideLabel: "Time"
  },
  "stack",
  {"colors": [6484479, 12685311, 8257437], "moveSpeed": 4.8, "size": 2.5, "balance": true}
);
