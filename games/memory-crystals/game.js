import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Memory Crystals",
    tagline: "Memory puzzle on a floating 3D board.",
    instructions: "Move the cursor around the board and flip pods to match pairs before the timer runs out.",
    controls: "Arrow pad moves cursor \u2022 GO flips a pod",
    tip: "Watch the corners first so you build anchors in your memory.",
    storageKey: "best_memory-crystals",
    sideLabel: "Time"
  },
  "memory",
  {"cols": 4, "rows": 3, "timer": 55, "colors": [16766827, 6484479, 12685311, 8257437, 16740241, 16777215]}
);
