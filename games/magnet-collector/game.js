import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Magnet Collector",
    tagline: "Catch mode with an active magnet pull for faster clears.",
    instructions: "Move under the drops. Hold GO to activate the magnet and pull nearby pieces toward you.",
    controls: "Left / Right move \u2022 Hold GO to magnet pull",
    tip: "Save magnet for crowded clusters.",
    storageKey: "best_magnet-collector",
    sideLabel: "Time"
  },
  "catcher",
  {"timer": 40, "colors": [16766827, 16777215, 6484479], "magnet": true}
);
