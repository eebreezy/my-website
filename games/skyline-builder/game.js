import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Skyline Builder",
    tagline: "The most forgiving stacker, good for long runs.",
    instructions: "Drop tower sections onto the skyline base. The cleaner the drop, the higher your score climbs.",
    controls: "GO to place tower sections",
    tip: "This one rewards patience.",
    storageKey: "best_skyline-builder",
    sideLabel: "Time"
  },
  "stack",
  {"colors": [6484479, 16766827, 12685311], "moveSpeed": 3.6, "size": 3.0}
);
