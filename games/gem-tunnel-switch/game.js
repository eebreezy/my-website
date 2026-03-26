import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Gem Tunnel Switch",
    tagline: "High-speed crystal hunt inside a 3D tunnel lane run.",
    instructions: "Ride the tunnel and chase crystals. Low walls can be jumped, but missing too many gems kills your momentum.",
    controls: "Left / Right to switch \u2022 Jump over blockers",
    tip: "Stay greedy. Crystals are your main score source here.",
    storageKey: "best_gem-tunnel-switch",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 8257437, "collectColor": 6484479, "obstacleColor": 16740241, "speed": 22, "timeScore": 2, "collectChance": 0.68}
);
