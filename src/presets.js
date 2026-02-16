const STORAGE_KEY = "parametric-box-presets-v1";
const DEFAULT_PRESET_NAME = "ESP32 Base";

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
    lipClearance: 0.25,
    postDiameter: 6,
    screwHoleDiameter: 2.6,
    postOffset: 8,
    countersink: false,
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

export function listPresets() {
  const map = readStore();
  return [DEFAULT_PRESET_NAME, ...Object.keys(map).sort()];
}

export function loadPreset(name) {
  if (name === DEFAULT_PRESET_NAME) return { ...DEFAULT_PRESET.params };
  const map = readStore();
  return map[name] ? { ...map[name] } : null;
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
