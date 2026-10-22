// All plan geometry is given in pixels of ref/plan.png (1381 x 1284).
// Scale was derived from the labelled room areas: Zimmer 15.1 m² and Zimmer
// 18.2 m² both give 8721 px²/m², i.e. 93.4 px per metre.
// World axes: +X = plan right (east), +Z = plan down (south), +Y = up.
export const PX_PER_M = 93.4;
export const S = 1 / PX_PER_M;
export const ORIGIN = { x: 49, y: 56 }; // north-west outer corner of the flat

export const CEILING = 2.6; // clear room height (m)
export const DOOR_H = 2.25; // interior door head height (m)
export const WINDOW_HEAD = 2.4; // window / glazing head height (m)
export const SLAB = 0.28; // floor slab thickness used for exterior edges

export const X = (px) => (px - ORIGIN.x) * S;
export const Z = (py) => (py - ORIGIN.y) * S;
export const len = (px) => px * S;

// Full-height wall rectangles [x0, y0, x1, y1] in plan px.
export const WALLS = [
  // west wing exterior + north
  [49, 416, 77, 1132], // west exterior wall
  [49, 416, 557, 441], // north wall of Réduit / kitchen
  [557, 427, 838, 441], // Dusche south wall (behind kitchen counter)
  [838, 418, 852, 441],
  [531, 245, 557, 441], // Dusche west wall
  [531, 245, 852, 268], // Dusche north wall
  [838, 244, 852, 326], // Dusche east wall (door gap 326-418)
  [707, 56, 787, 268], // entrance west wall incl. shaft
  [707, 56, 871, 83], // north wall left of entrance door
  [960, 56, 1345, 83], // north wall right of entrance door
  [1039, 56, 1055, 294], // wall between wardrobe niche and Bad
  [983, 280, 1145, 294], // Bad south wall (door gap 1145-1237)
  [1237, 280, 1317, 294],
  [1317, 56, 1345, 831], // east exterior wall
  [983, 294, 997, 364], // Zimmer 18.2 west wall (door gap 364-456)
  [983, 456, 997, 790],
  [968, 790, 1128, 831], // Zimmer 18.2 south wall (window 1128-1281)
  [1281, 790, 1345, 831],
  [49, 1090, 113, 1132], // south facade (windows 113-266, 451-604)
  [266, 1090, 451, 1132],
  [604, 1090, 796, 1132],
  [359, 441, 373, 509], // wall Réduit|Küche (door gap 509-601)
  [359, 601, 373, 692], // wall Zimmer 15.1|Wohnen (door gap 692-784)
  [359, 784, 373, 1090],
  [77, 610, 373, 623], // Réduit | Zimmer 15.1
  [77, 441, 100, 610], // shaft strip inside Réduit
];

// Low installation walls (Vorwand) drawn white in the plan, ~1.2 m high.
export const LOW_WALLS = [
  { rect: [557, 268, 838, 289], h: 1.2 }, // Dusche WC/basin wall
  { rect: [1055, 83, 1317, 103], h: 1.2 }, // Bad
];

// Round structural column at the glazed corner.
export const COLUMNS = [{ x: 735.5, y: 808, r: 9 }];

// Door openings. rect = gap in the wall, hinge = plan px of hinge point,
// open = plan px of the open leaf's free end (as drawn in the plan).
export const DOORS = [
  { id: 'entrance', rect: [871, 56, 960, 83], hinge: [958, 83], open: [958, 170], entrance: true },
  { id: 'dusche', rect: [838, 326, 852, 418], hinge: [845, 418], open: [755, 418] },
  { id: 'bad', rect: [1145, 280, 1237, 294], hinge: [1235, 294], open: [1235, 380] },
  { id: 'zimmer18', rect: [983, 364, 997, 456], hinge: [997, 366], open: [1082, 366] },
  { id: 'reduit', rect: [359, 509, 373, 601], hinge: [359, 600], open: [273, 600] },
  { id: 'zimmer15', rect: [359, 692, 373, 784], hinge: [359, 694], open: [273, 694] },
];

// Windows / glazing in walls. sill/head in metres.
export const WINDOWS = [
  { id: 'zimmer15', rect: [113, 1090, 266, 1132], sill: 0, head: WINDOW_HEAD, facing: 'S' },
  { id: 'wohnen', rect: [451, 1090, 604, 1132], sill: 0, head: WINDOW_HEAD, facing: 'S' },
  { id: 'zimmer18', rect: [1128, 790, 1281, 831], sill: 0, head: WINDOW_HEAD, facing: 'S' },
];

// Free-standing glazing towards the loggia (no wall around it).
export const GLAZING = [
  { id: 'wohnen-ost', from: [780, 818], to: [780, 1090], head: WINDOW_HEAD, facing: 'E' }, // living → loggia
  { id: 'essen-sued', from: [745, 820], to: [968, 820], head: WINDOW_HEAD, facing: 'S' }, // dining → loggia
];

// Loggia (outdoor), outline + parapets.
export const LOGGIA = {
  floor: [800, 831, 1105, 1245],
  parapets: [
    [1090, 835, 1105, 1245],
    [800, 1230, 1105, 1245],
    [798, 1125, 820, 1245],
  ],
  column: { x: 1073, y: 1116, r: 7 },
};

export const ROOMS = {
  eingang: { name: 'Eingang', area: 8.7, center: [880, 250] },
  dusche: { name: 'Dusche', area: 4.3, center: [700, 360] },
  bad: { name: 'Bad', area: 5.2, center: [1185, 200] },
  zimmer18: { name: 'Zimmer 18.2', area: 18.2, center: [1150, 560] },
  reduit: { name: 'Réduit', area: 5.0, center: [230, 525] },
  kueche: { name: 'Küche', area: 10.1, center: [560, 560] },
  essen: { name: 'Esszimmer', area: 10.8, center: [860, 620] },
  wohnen: { name: 'Wohnzimmer', area: 17.0, center: [560, 900] },
  zimmer15: { name: 'Zimmer 15.1', area: 15.1, center: [220, 850] },
  loggia: { name: 'Loggia', area: 14.4, center: [950, 1050] },
};

// Furniture footprints read off the plan (px), for the room builders.
export const FURNITURE = {
  kitchenRun: [377, 441, 720, 498], // counter along north wall
  kitchenTall: [377, 441, 495, 498], // tall units (crossed boxes)
  sink: [523, 444, 577, 492],
  cooktop: [641, 444, 687, 492],
  island: [467, 613, 692, 698],
  diningTable: [813, 558, 897, 747],
  sofa: [378, 818, 467, 1053],
  rug: [425, 797, 718, 1072],
  coffeeTable: [507, 897, 582, 973],
  armchairs: [
    [613, 847, 690, 920],
    [613, 940, 690, 1012],
  ],
  z15Wardrobe: [78, 625, 358, 680],
  z15Desk: [78, 865, 143, 1005],
  z15Chair: [143, 907, 172, 965],
  z15Bed: [275, 918, 358, 1090],
  z15Nightstand: [284, 1045, 352, 1080],
  z18Bed: [998, 533, 1185, 703],
  z18Nightstands: [
    [998, 487, 1040, 530],
    [998, 707, 1040, 750],
  ],
  z18Wardrobe: [1262, 470, 1316, 742],
  bathtub: [1058, 108, 1130, 272],
  badSink: [1165, 108, 1220, 152],
  badWC: [1255, 105, 1293, 160],
  duscheShower: [557, 289, 635, 427], // glass at x=635 from y 292 to 360
  duscheWC: [667, 289, 705, 345],
  duscheSink: [737, 289, 792, 335],
  entryWardrobe: [983, 83, 1039, 278],
  washerDryer: [101, 442, 158, 498],
};

// Camera presets. pos in plan px, eye in m, dir = compass heading in degrees
// (0 = north/up in plan, 90 = east, 180 = south). fov = vertical degrees.
export const VIEWS = {
  // Matches ref/photo_living.jpg (1080x607): looking south from the kitchen.
  photo: { pos: [571, 445], eye: 1.3, dir: 180, pitch: 0, fov: 52.9, label: 'Foto-Blick' },
  wohnen: { pos: [600, 700], eye: 1.6, dir: 200, pitch: -5, fov: 60, label: 'Wohnzimmer' },
  kueche: { pos: [560, 1000], eye: 1.6, dir: 10, pitch: -5, fov: 60, label: 'Küche' },
  essen: { pos: [600, 780], eye: 1.6, dir: 60, pitch: -5, fov: 60, label: 'Esszimmer' },
  eingang: { pos: [915, 120], eye: 1.6, dir: 190, pitch: -5, fov: 60, label: 'Eingang' },
  zimmer18: { pos: [1050, 420], eye: 1.6, dir: 150, pitch: -8, fov: 65, label: 'Zimmer 18.2' },
  bad: { pos: [1190, 270], eye: 1.6, dir: 0, pitch: -15, fov: 70, label: 'Bad' },
  dusche: { pos: [820, 400], eye: 1.6, dir: 300, pitch: -15, fov: 70, label: 'Dusche' },
  reduit: { pos: [330, 560], eye: 1.6, dir: 285, pitch: -15, fov: 70, label: 'Réduit' },
  zimmer15: { pos: [330, 740], eye: 1.6, dir: 220, pitch: -8, fov: 65, label: 'Zimmer 15.1' },
  loggia: { pos: [830, 860], eye: 1.6, dir: 150, pitch: -5, fov: 65, label: 'Loggia' },
};
