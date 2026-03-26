import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Beat Bounce",
    tagline: "A rhythm-lite 3D score chaser with synth feedback.",
    instructions: "Move between pads before the next landing. Hitting the beat window gives a bigger bounce and more points.",
    controls: "Left / Right chooses the landing pad",
    tip: "Use the side timer as the beat pulse.",
    storageKey: "best_beat-bounce",
    sideLabel: "Time"
  },
  "bounce",
  {"timer": 38, "colors": [16740241, 6484479, 16766827]}
);
