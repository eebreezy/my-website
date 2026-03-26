import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Target Burst Aim",
    tagline: "Quick-fire 3D gallery shooting with synth sound effects.",
    instructions: "Move your blaster with left and right. Press GO to fire and pop every target you can before time expires.",
    controls: "Left / Right aim \u2022 GO fires",
    tip: "Lead moving targets slightly.",
    storageKey: "best_target-burst-aim",
    sideLabel: "Time"
  },
  "shooter",
  {"timer": 42, "colors": [16740241, 6484479, 16766827]}
);
