import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Sky Ring Runner",
    tagline: "3D endless runner with ring combos and quick lane shifts.",
    instructions: "Tap left and right to switch lanes. Hit jump to vault low walls. Fly through crystals and keep your streak alive.",
    controls: "Left / Right to change lanes \u2022 Jump to clear hazards",
    tip: "Crystals raise the combo. Walls end the run.",
    storageKey: "best_sky-ring-runner",
    sideLabel: "Time"
  },
  "runnerLane",
  {"playerColor": 6484479, "collectColor": 16766827, "obstacleColor": 16740241, "speed": 20, "jump": 6.9, "timeScore": 5, "collectChance": 0.52}
);
