# Shared brief for all builders

Goal: a three.js walk-through of the flat in `ref/plan.png`, to scale, whose
rooms, finishes and furniture match the interior photo `ref/photo_living.jpg`.
**The bar is the photo itself**: a critic with fresh context compares a
screenshot of our scene against the photo, picks the better image and names
the biggest gap. We loop until ours wins.

## Run / look
- Static site, no build step. `index.html` + ES modules in `src/`, three.js
  r180 vendored in `vendor/three` (import `three` and `three/addons/...`).
- Screenshot: `node tools/shot.mjs <view> <out.png> [w] [h] [extra-query]`
  - `photo` = camera matched to the photo (1080x607). Compare with
    `python3 tools/compare.py side shots/x.png ref/photo_living.jpg out.png`
    or `... blend ... 0.5` for an overlay.
  - `top` = orthographic top-down at 1381x1284, overlays `ref/plan.png`
    pixel for pixel (`compare.py blend shots/top.png ref/plan.png out.png`).
  - any key of `VIEWS` in `src/plan.js` (wohnen, kueche, essen, eingang,
    zimmer18, bad, dusche, reduit, zimmer15, loggia).
  - extra query e.g. `hide=ceiling`.
  - The tool prints which pieces built OK and any console errors. Always check
    it: a piece that throws is skipped silently in the scene.
- Headless Chromium uses SwiftShader (CPU WebGL). Keep a screenshot under
  ~60 s. Rendering must also stay smooth in a normal browser (target 60 fps on
  a laptop GPU): bake/cheat where you can, avoid per-frame heavy work.
- Save your own screenshots under `shots/<piece>/` (git-ignored).

## Coordinates
- `src/plan.js` holds every measurement in plan pixels. 93.4 px = 1 m.
  `X(px)`, `Z(py)` convert to metres; +X east (plan right), +Z south (plan
  down), +Y up. Ceiling 2.60 m, door head 2.25 m, window head 2.40 m.
- `plan.FURNITURE` has footprints read off the plan; keep furniture on them
  (to scale) unless the photo clearly proves otherwise — then say so.
- `src/util.js`: `boxFromRect`, `rectInfo`, `canvasTexture`, seeded `rng`
  (procedural textures must be deterministic), `shadowAll`.
- `ctx` passed to `build(ctx)`: `THREE, scene, camera, renderer, plan, groups
  {ceiling, exterior}, addCollider(rectPx), waitFor(promise), render (may be
  replaced), onFrame[], onResize[], shot`.
- Put anything that belongs to the ceiling (ceiling planes, downlights) in
  `ctx.groups.ceiling` so the top view can hide it.
- Add colliders (plan px rects) for big furniture so the walker can't pass
  through it.

## Ownership (do not edit files you do not own)
| piece | file | owns |
|---|---|---|
| shell | `src/shell.js` | walls, floor footprint + oak floor, wall paint, ceiling, skirting, door frames + leaves + handles, wall/floor base materials |
| env | `src/env.js` | lights, sun, sky/HDRI, renderer tone mapping + post, window/glazing frames + glass for `WINDOWS` and `GLAZING`, loggia (floor, soffit, parapets, railing, loggia furniture), exterior surroundings, ceiling downlight fittings |
| living | `src/living.js` | Wohnzimmer: sofa, armchairs, coffee table, rug, arc lamp, plant, painting, curtains on all living/dining windows |
| kitchen | `src/kitchen.js` | Küche + Esszimmer: kitchen run, tall units, island + props on it, grocery bag, dining table + 6 chairs, any pendant |
| bedrooms | `src/bedrooms.js` | Zimmer 15.1 + Zimmer 18.2 contents incl. guitar + music stand seen through the door in the photo, bedroom curtains |
| wetrooms | `src/wetrooms.js` | Bad, Dusche, Eingang (built-in wardrobe), Réduit (washer/dryer) — tiles, fixtures, floors |

`src/plan.js` and `src/main.js` belong to the orchestrator; if you need a
change there (a new view, a constant), say so in your report instead of
editing. Assets: put downloaded files under `assets/<piece>/` and list source
+ licence in `assets/<piece>/CREDITS.md`. Only CC0 / free-licence sources
(Poly Haven, ambientCG work from this container). Keep each texture ≤2k,
JPG/WebP where possible, total per piece ≤ 15 MB. Do not `git commit`.

## What the photo shows (orchestrator's reading)
Camera: in the kitchen at plan (571, 445), eye 1.30 m, looking due south,
vertical FOV ≈ 53° (horizontal ≈ 83°), no pitch (verticals vertical).
- Walls and ceiling: warm white matt paint, crisp. Recessed round downlight in
  ceiling. Thin shadow gap / no visible cornice.
- Floor: light natural oak, wide long planks running north-south (towards the
  camera), matt oiled, subtle grain, slight warm sheen near windows.
- Glazing: floor-to-ceiling, slim light-grey/white frames. Left: corner
  glazing to the loggia with a slim white column at the corner; loggia soffit
  visible (white slatted/ribbed underside), white vertical-bar railing,
  neighbouring houses with tiled roofs, trees, mountains far away, pale blue
  sky. Back wall: French door (two leaves) with sheer white curtains on a
  ceiling track either side. Right: a ceiling-high door opening into a bright
  room (guitar on a stand, music stand, tall window).
- Living: deep-blue velvet 3-seat sofa with rounded arms and a single long
  seat cushion, against the west wall; framed colourful abstract print above
  it (blue/orange pattern, cream mat, natural wood frame); two cream boucle
  lounge chairs with sculpted curved shells; low square coffee table — clear
  glass top on a chrome/mirror block base, small bowl on top; cream/ivory
  rug with subtle wave pattern; chrome arc floor lamp with a dome shade and
  marble base; fiddle-leaf fig in a white cylindrical pot by the glazing.
- Kitchen island (foreground left): white flat-panel handleless fronts,
  light-grey stone-look worktop (honed, slight veining). Props on it: kitchen
  scale with bowl, eggs in a dish, wooden board with flour + rolling pin, a
  butter dish, an open magazine. Brown paper grocery bag with vegetables on
  the floor next to the island.
- Light: bright overcast-to-soft-sun daylight from the south and east, soft
  contact shadows, very clean, slightly warm. It's a high-end arch-viz
  render: soft GI look, no hard black shadows, gentle vignetting none.

Known conflict: the photo's island ends just left of image centre, which
puts it ~1.1 m further east than the plan. The plan wins for position;
mention it rather than moving the island.
