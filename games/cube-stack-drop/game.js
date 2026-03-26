import { makeGame } from '../../shared/families.js';

makeGame(
  {
    title: "Cube Stack Drop",
    tagline: "Precision stacking with bright glossy cubes.",
    instructions: "Tap GO when the moving block lines up with the tower. Miss badly and your run ends.",
    controls: "GO to drop the moving block",
    tip: "Small offsets still count, but perfect drops score bigger.",
    storageKey: "best_cube-stack-drop",
    sideLabel: "Time"
  },
  "stack",
  {"colors": [16766827, 6484479, 12685311], "moveSpeed": 4.2, "size": 2.8}
);
