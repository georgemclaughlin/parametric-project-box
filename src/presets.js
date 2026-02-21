const STORAGE_KEY = "parametric-box-presets-v1";
const DEFAULT_PRESET_NAME = "ESP32 Base";
const DEPRECATED_FIELDS = ["postOffset", "lipClearance"];

const FACE_KEYS = ["Front", "Back", "Left", "Right"];

const REQUIRED_FIELDS = [
  "length",
  "width",
  "height",
  "wallThickness",
  "floorThickness",
  "lidThickness",
  "cornerRadius",
  "lipHeight",
  "fitTolerance",
  "postDiameter",
  "screwHoleDiameter",
  "countersink",
  "enableCenteredStandoffs",
  "standoffHeight",
  "standoffDiameter",
  "standoffHoleDiameter",
  "standoffSpacingX",
  "standoffSpacingY"
];

for (const face of FACE_KEYS) {
  REQUIRED_FIELDS.push(
    `faceEdit${face}`,
    `vent${face}Enabled`,
    `vent${face}Count`,
    `vent${face}Width`,
    `vent${face}Spacing`,
    `wire${face}`,
    `wire${face}Profile`,
    `wire${face}RoundDiameter`,
    `wire${face}RectWidth`,
    `wire${face}RectHeight`,
    `wire${face}OffsetH`,
    `wire${face}OffsetV`
  );
}

export const DEFAULT_PRESET = {
  name: DEFAULT_PRESET_NAME,
  params: {
    length: 95,
    width: 65,
    height: 32,
    wallThickness: 2,
    floorThickness: 2.4,
    lidThickness: 2,
    cornerRadius: 3,
    lipHeight: 3,
    fitTolerance: 0.25,
    postDiameter: 8,
    screwHoleDiameter: 2.6,
    countersink: false,
    enableCenteredStandoffs: false,
    standoffHeight: 6,
    standoffDiameter: 5,
    standoffHoleDiameter: 2.2,
    standoffSpacingX: 58,
    standoffSpacingY: 23,
    faceEditFront: false,
    faceEditBack: true,
    faceEditLeft: false,
    faceEditRight: false,
    ventFrontEnabled: false,
    ventFrontCount: 6,
    ventFrontWidth: 1.6,
    ventFrontSpacing: 1.2,
    ventBackEnabled: false,
    ventBackCount: 6,
    ventBackWidth: 1.6,
    ventBackSpacing: 1.2,
    ventLeftEnabled: false,
    ventLeftCount: 6,
    ventLeftWidth: 1.6,
    ventLeftSpacing: 1.2,
    ventRightEnabled: false,
    ventRightCount: 6,
    ventRightWidth: 1.6,
    ventRightSpacing: 1.2,
    wireFront: false,
    wireFrontProfile: "rect",
    wireFrontRoundDiameter: 6,
    wireFrontRectWidth: 10,
    wireFrontRectHeight: 4,
    wireFrontOffsetH: 0,
    wireFrontOffsetV: 0,
    wireBack: true,
    wireBackProfile: "rect",
    wireBackRoundDiameter: 6,
    wireBackRectWidth: 10,
    wireBackRectHeight: 4,
    wireBackOffsetH: 0,
    wireBackOffsetV: 0,
    wireLeft: false,
    wireLeftProfile: "rect",
    wireLeftRoundDiameter: 6,
    wireLeftRectWidth: 10,
    wireLeftRectHeight: 4,
    wireLeftOffsetH: 0,
    wireLeftOffsetV: 0,
    wireRight: false,
    wireRightProfile: "rect",
    wireRightRoundDiameter: 6,
    wireRightRectWidth: 10,
    wireRightRectHeight: 4,
    wireRightOffsetH: 0,
    wireRightOffsetV: 0
  }
};

function readStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStore(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function isCompatiblePreset(params) {
  if (!params || typeof params !== "object") return false;
  if (DEPRECATED_FIELDS.some((field) => field in params)) return false;
  return REQUIRED_FIELDS.every((field) => field in params);
}

function pruneIncompatiblePresets(map) {
  let changed = false;
  const next = {};
  for (const [name, params] of Object.entries(map)) {
    if (isCompatiblePreset(params)) {
      next[name] = params;
    } else {
      changed = true;
    }
  }
  return { next, changed };
}

export function listPresets() {
  const map = readStore();
  const { next, changed } = pruneIncompatiblePresets(map);
  if (changed) writeStore(next);
  return [DEFAULT_PRESET_NAME, ...Object.keys(next).sort()];
}

export function loadPreset(name) {
  if (name === DEFAULT_PRESET_NAME) return { ...DEFAULT_PRESET.params };
  const map = readStore();
  const params = map[name];
  if (!isCompatiblePreset(params)) {
    if (params) {
      delete map[name];
      writeStore(map);
    }
    return null;
  }
  return { ...params };
}

export function savePreset(name, params) {
  const cleaned = name.trim();
  if (!cleaned || cleaned === DEFAULT_PRESET_NAME) return false;

  const map = readStore();
  map[cleaned] = { ...params };
  writeStore(map);
  return true;
}

export function deletePreset(name) {
  if (!name || name === DEFAULT_PRESET_NAME) return false;

  const map = readStore();
  if (!map[name]) return false;

  delete map[name];
  writeStore(map);
  return true;
}
