import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Mini Golf Orbit",
    tagline: "Arcade golf with short, fast orbital curves.",
    instructions: "Use the moving meter, then tap GO to launch the ball toward the glowing cup.",
    controls: "GO shoots \u2022 Left / Right nudges the shot line",
    tip: "Use medium power most of the time.",
    storageKey: "best_mini-golf-orbit",
    sideLabel: "Time"
  },
  "sports",
  {"mode": "golf", "colors": [8257437, 16766827, 6484479], "timer": 38}
);
