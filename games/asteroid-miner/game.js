import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Asteroid Miner",
    tagline: "Mining meets arcade shooting in deep space.",
    instructions: "Fire at moving asteroids. Every hit turns into glowing score ore.",
    controls: "Left / Right aim \u2022 GO fires",
    tip: "Stay centered and let targets drift into your shot line.",
    storageKey: "best_asteroid-miner",
    sideLabel: "Time"
  },
  "shooter",
  {"timer": 44, "colors": [8257437, 12685311, 16766827]}
);
