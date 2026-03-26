import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Lava Hop",
    tagline: "More jump-heavy than the other runners.",
    instructions: "You are above lava, so use jump more often. Cool plates score, lava blocks end the run.",
    controls: "Left / Right lane change \u2022 Jump often",
    tip: "Jump early. Waiting too long feels impossible.",
    storageKey: "best_lava-hop",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 16740241, "collectColor": 16766827, "obstacleColor": 16740241, "speed": 22.5, "jump": 7.4, "timeScore": 3, "collectChance": 0.48}
);
