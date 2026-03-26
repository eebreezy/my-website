import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Shield Spin",
    tagline: "Pure defense with strong audio cues and tight timing.",
    instructions: "Spin your shield to intercept incoming crystals before they hit the core.",
    controls: "Left / Right rotates the shield",
    tip: "Block early. Do not chase at the last second.",
    storageKey: "best_shield-spin",
    sideLabel: "Time"
  },
  "shield",
  {"timer": 42, "colors": [16740241, 16766827, 12685311]}
);
