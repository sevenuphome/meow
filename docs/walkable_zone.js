// Walkable zone data — generated from walkable_editor.html
// x: 0%-80%, y per-column min from editor
const WALK_Y_MIN = {"0":81,"5":81,"10":81,"15":81,"20":81,"25":81,"30":81,"35":81,"40":83,"45":86,"50":86,"55":86,"60":86,"65":85,"70":82,"75":81,"80":81,"100":81};
const WALK_X_MIN = 0;
const WALK_X_MAX = 80;
const WALK_Y_MAX = 100;

function walkYMin(x) {
  const k = Math.round(x / 5) * 5;
  return WALK_Y_MIN[Math.min(WALK_X_MAX, Math.max(WALK_X_MIN, k))] || 84;
}

function clampToWalkable(x, y) {
  x = Math.max(WALK_X_MIN, Math.min(WALK_X_MAX, x));
  return [x, Math.max(walkYMin(x), Math.min(WALK_Y_MAX, y))];
}
