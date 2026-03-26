import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Wave Surfer",
    tagline: "A smoother, more vertical drift challenge.",
    instructions: "Steer up, down, left, and right to stay inside the safe wave gates.",
    controls: "Arrow pad to surf the wave path",
    tip: "Stay light on the vertical buttons.",
    storageKey: "best_wave-surfer",
    sideLabel: "Time"
  },
  "drift",
  {"timer": 38, "forward": 16.5, "speed": 5.2, "colors": [6484479, 8257437, 16766827]}
);
