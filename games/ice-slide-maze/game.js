import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Ice Slide Maze",
    tagline: "One-move slides across a 3D ice grid.",
    instructions: "Each move slides until a wall stops you. Plan the route and reach the green goal.",
    controls: "Arrow pad slides the player",
    tip: "Use walls as brakes.",
    storageKey: "best_ice-slide-maze",
    sideLabel: "Time"
  },
  "maze",
  {"timer": 55, "map": ["########", "#S..#..#", "#.#.#.##", "#.#...G#", "#.###..#", "#......#", "########"]}
);
