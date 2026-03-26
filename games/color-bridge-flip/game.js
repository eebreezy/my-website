import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Color Bridge Flip",
    tagline: "Simple rules, fast hands, bright 3D visuals.",
    instructions: "Tap GO to cycle your color. Match the bridge color before you land on the next platform.",
    controls: "GO cycles colors",
    tip: "Listen to the pitch change to track your current color.",
    storageKey: "best_color-bridge-flip",
    sideLabel: "Time"
  },
  "colorFlip",
  {"timer": 36, "speed": 18, "colors": [16766827, 6484479, 12685311]}
);
