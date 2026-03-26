import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Prism Sort",
    tagline: "Catch only the target color and switch focus fast.",
    instructions: "Move under the right prism color. The target color shown in the side panel changes after every correct catch.",
    controls: "Left / Right move \u2022 Catch only the shown color",
    tip: "Ignore bad drops. Do not chase everything.",
    storageKey: "best_prism-sort",
    sideLabel: "Target"
  },
  "catcher",
  {"timer": 42, "colors": [16766827, 6484479, 12685311], "colorTarget": true}
);
