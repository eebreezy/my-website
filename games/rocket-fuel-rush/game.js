import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Rocket Fuel Rush",
    tagline: "A survival sprint with a draining fuel gauge.",
    instructions: "Collect fuel crystals to keep going. Every second burns fuel, so stay active and avoid drones.",
    controls: "Left / Right lane shift \u2022 Jump clears drones",
    tip: "Fuel is more important than pure survival.",
    storageKey: "best_rocket-fuel-rush",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 16766827, "collectColor": 8257437, "obstacleColor": 16740241, "speed": 21, "timeScore": 1, "collectChance": 0.62, "sideMode": "fuel"}
);
