import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Rail Grinder",
    tagline: "A tighter lane runner with more movement pressure.",
    instructions: "Stay on the safe rail, dodge blockers, and chase score crystals while the speed ramps up.",
    controls: "Left / Right rail switch \u2022 Jump blockers",
    tip: "Favor clean survival over small crystals at high speed.",
    storageKey: "best_rail-grinder",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 6484479, "collectColor": 12685311, "obstacleColor": 16740241, "speed": 25, "timeScore": 6, "collectChance": 0.4}
);
