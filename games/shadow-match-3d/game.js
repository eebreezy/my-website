import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Shadow Match 3D",
    tagline: "Puzzle board with a slightly tighter timer than Memory Crystals.",
    instructions: "Move the cursor and flip tiles to reveal matching shape colors. Clear the board before the clock ends.",
    controls: "Arrow pad moves cursor \u2022 GO flips",
    tip: "Work row by row.",
    storageKey: "best_shadow-match-3d",
    sideLabel: "Time"
  },
  "memory",
  {"cols": 4, "rows": 3, "timer": 48, "colors": [16766827, 6484479, 12685311, 8257437, 16740241, 16777215]}
);
