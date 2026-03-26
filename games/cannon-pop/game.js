import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Cannon Pop",
    tagline: "Cleaner aim, brighter targets, faster reload feel.",
    instructions: "Slide the cannon line and fire at the floating discs before time runs out.",
    controls: "Left / Right aim \u2022 GO fires",
    tip: "The balloons drift, so keep a calm rhythm.",
    storageKey: "best_cannon-pop",
    sideLabel: "Time"
  },
  "shooter",
  {"timer": 40, "balloon": true, "colors": [16740241, 16766827, 6484479]}
);
