const STORAGE_KEY = "parametric-box-presets-v1";
const DEFAULT_PRESET_NAME = "ESP32 Base";
const DEPRECATED_FIELDS = ["postOffset", "lipClearance"];
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
  "standoffSpacingY",
  "enableVents",
  "ventFace",
  "ventCount",
  "ventWidth",
  "ventSpacing"
];

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
    enableVents: false,
    ventFace: "front",
    ventCount: 6,
    ventWidth: 1.6,
    ventSpacing: 1.2
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
