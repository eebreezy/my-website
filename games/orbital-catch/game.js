import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Orbital Catch",
    tagline: "3D orbit control around a glowing center.",
    instructions: "Move around the ring and scoop up orbiting crystals. Keep rotating and chain catches.",
    controls: "Left / Right rotates around the core",
    tip: "Stay smooth instead of zig-zagging.",
    storageKey: "best_orbital-catch",
    sideLabel: "Time"
  },
  "orbital",
  {"timer": 40, "colors": [16766827, 6484479, 12685311]}
);
