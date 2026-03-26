import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Drone Rescue",
    tagline: "Clean hovering catches with bright 3D drones.",
    instructions: "Move under falling drones and catch as many as you can before time expires.",
    controls: "Left / Right moves the rescue ring",
    tip: "Hold center between spawns.",
    storageKey: "best_drone-rescue",
    sideLabel: "Time"
  },
  "catcher",
  {"timer": 40, "colors": [6484479, 16777215, 8257437], "speed": 5.8}
);
