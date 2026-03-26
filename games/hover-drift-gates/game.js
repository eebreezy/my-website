import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Hover Drift Gates",
    tagline: "A smooth 3D drift challenge above the grid.",
    instructions: "Steer in all four directions to pass through gates. Every clean pass adds points.",
    controls: "Arrow pad to steer the hover craft",
    tip: "Set up early. Last-second corrections are risky.",
    storageKey: "best_hover-drift-gates",
    sideLabel: "Time"
  },
  "drift",
  {"timer": 36, "forward": 18, "speed": 5.5, "colors": [6484479, 16766827, 12685311]}
);
