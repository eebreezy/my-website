import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Robot Chef Catch",
    tagline: "Fast food-catching with target color orders.",
    instructions: "Catch only the ingredient color shown on the side. Wrong ingredients cost points.",
    controls: "Left / Right move \u2022 Follow the order color",
    tip: "Let bad items fall. The side label tells you the next order.",
    storageKey: "best_robot-chef-catch",
    sideLabel: "Target"
  },
  "catcher",
  {"timer": 42, "colors": [16766827, 16740241, 8257437], "colorTarget": true}
);
