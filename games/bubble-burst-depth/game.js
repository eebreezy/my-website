import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Bubble Burst Depth",
    tagline: "Depth-heavy target popping with softer colors.",
    instructions: "Aim and fire at rising bubble targets. Pop as many as you can before the clock ends.",
    controls: "Left / Right aim \u2022 GO fires",
    tip: "Take the easy front targets when the screen gets busy.",
    storageKey: "best_bubble-burst-depth",
    sideLabel: "Time"
  },
  "shooter",
  {"timer": 41, "balloon": true, "colors": [6484479, 8257437, 12685311]}
);
