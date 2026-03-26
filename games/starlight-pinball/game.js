import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Starlight Pinball",
    tagline: "Bright 3D bumpers with simple one-screen pinball control.",
    instructions: "Use left and right to kick the lower paddles and keep the ball alive. Hit bumpers to build score.",
    controls: "Left / Right flips the lower paddles",
    tip: "Do not wait until the ball is already past the flipper.",
    storageKey: "best_starlight-pinball",
    sideLabel: "Time"
  },
  "pinball",
  {"timer": 50, "colors": [16766827, 6484479, 16740241]}
);
