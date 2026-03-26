import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Portal Dash",
    tagline: "Fast runner with brighter combo feedback and sharper hazards.",
    instructions: "Switch lanes and hit portal crystals to keep the score chain active. Missing the rhythm slows your climb.",
    controls: "Left / Right to dash lanes \u2022 Jump low blockers",
    tip: "Think two spawns ahead.",
    storageKey: "best_portal-dash",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 12685311, "collectColor": 6484479, "obstacleColor": 16740241, "speed": 24, "timeScore": 4, "collectChance": 0.58}
);
