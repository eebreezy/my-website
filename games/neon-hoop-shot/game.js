import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Neon Hoop Shot",
    tagline: "Arcade basketball with floating neon hoops.",
    instructions: "Wait for the meter to feel right, then tap GO to shoot. Make as many shots as you can before time runs out.",
    controls: "GO to shoot \u2022 Left / Right shifts your release line",
    tip: "The sweet spot is near the top of the meter.",
    storageKey: "best_neon-hoop-shot",
    sideLabel: "Time"
  },
  "sports",
  {"mode": "hoop", "colors": [16766827, 6484479, 16740241], "timer": 40}
);
