import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Meteor Lane Dodge",
    tagline: "Fast dodging with harder spawns every few seconds.",
    instructions: "Switch lanes to avoid incoming meteors. This one is about survival first and score second.",
    controls: "Left / Right to dodge \u2022 Jump optional",
    tip: "Do not over-move. Hold the center until danger is real.",
    storageKey: "best_meteor-lane-dodge",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 12685311, "collectChance": 0.25, "speed": 23, "timeScore": 7, "obstacleColor": 16740241, "collectColor": 8257437}
);
