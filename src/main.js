import { buildAssembly } from "./model/box.js?v=6";
import { exportStl } from "./export.js?v=6";
import { DEFAULT_PRESET, deletePreset, listPresets, loadPreset, savePreset } from "./presets.js?v=6";
import { DEFAULT_PARAMS, readParamsFromForm, writeParamsToForm } from "./state.js?v=6";
import { validateParams } from "./validators.js?v=6";
import { createViewer } from "./viewer.js?v=6";

const form = document.querySelector("#params-form");
const statusEl = document.querySelector("#status");
const errorsEl = document.querySelector("#errors");
const innerDimsEl = document.querySelector("#inner-dims");

const presetNameEl = document.querySelector("#preset-name");
const presetSelectEl = document.querySelector("#preset-select");
const savePresetBtn = document.querySelector("#save-preset");
const loadPresetBtn = document.querySelector("#load-preset");
const deletePresetBtn = document.querySelector("#delete-preset");

const exportAllBtn = document.querySelector("#export-all");
const exportBodyBtn = document.querySelector("#export-body");
const exportLidBtn = document.querySelector("#export-lid");

const viewerContainer = document.querySelector("#viewer");
const enableVentsEl = form.elements.namedItem("enableVents");
const ventFaceEls = [
  form.elements.namedItem("ventFront"),
  form.elements.namedItem("ventBack"),
  form.elements.namedItem("ventLeft"),
  form.elements.namedItem("ventRight")
];

let currentParams = { ...DEFAULT_PARAMS, ...DEFAULT_PRESET.params };
let currentModel = null;
let debounceTimer = null;
let viewer = null;

function syncVentControls() {
  const enabled = Boolean(enableVentsEl && "checked" in enableVentsEl && enableVentsEl.checked);
  for (const el of ventFaceEls) {
    if (!el || !("disabled" in el)) continue;
    el.disabled = !enabled;
  }
}

function renderErrors(messages) {
  errorsEl.innerHTML = "";
  for (const msg of messages) {
    const item = document.createElement("li");
    item.textContent = msg;
    errorsEl.appendChild(item);
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function refreshPresetSelect() {
  const names = listPresets();
  const selected = presetSelectEl.value;
  presetSelectEl.innerHTML = "";

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    presetSelectEl.appendChild(option);
  }

  if (names.includes(selected)) {
    presetSelectEl.value = selected;
  }
}

function regenerate() {
  if (!viewer) return;

  const nextParams = readParamsFromForm(form);
  updateInnerSummary(nextParams);
  const check = validateParams(nextParams);

  if (!check.valid) {
    renderErrors(check.errors);
    setStatus("Invalid parameters. Previous valid model is shown.");
    return;
  }

  try {
    const assembly = buildAssembly(nextParams);
    const tri = viewer.update(assembly);

    currentParams = nextParams;
    currentModel = assembly;

    const messages = [...check.warnings];
    renderErrors(messages);

    setStatus(
      `Model updated. Body: ${Math.round(tri.bodyTriangles)} tris, Lid: ${Math.round(tri.lidTriangles)} tris.`
    );
  } catch (err) {
    renderErrors(["Geometry generation failed."]);
    setStatus(String(err));
  }
}

function queueRegenerate() {
  if (!viewer) return;
  syncVentControls();
  setStatus("Regenerating...");
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(regenerate, 250);
}

function loadParams(params) {
  writeParamsToForm(form, params);
  syncVentControls();
  updateInnerSummary(params);
  queueRegenerate();
}

function updateInnerSummary(params) {
  const innerLength = params.length - 2 * params.wallThickness;
  const innerWidth = params.width - 2 * params.wallThickness;
  const innerHeight = params.height - params.floorThickness;

  const safe = (n) => (Number.isFinite(n) ? n.toFixed(1) : "-");
  innerDimsEl.textContent = `${safe(innerLength)} x ${safe(innerWidth)} x ${safe(innerHeight)} mm`;
}

form.addEventListener("input", queueRegenerate);
form.addEventListener("change", queueRegenerate);

savePresetBtn.addEventListener("click", () => {
  const name = presetNameEl.value.trim();
  const ok = savePreset(name, currentParams);
  if (!ok) {
    setStatus("Preset name is invalid or reserved.");
    return;
  }
  refreshPresetSelect();
  presetSelectEl.value = name;
  setStatus(`Saved preset: ${name}`);
});

loadPresetBtn.addEventListener("click", () => {
  const name = presetSelectEl.value;
  const preset = loadPreset(name);
  if (!preset) {
    loadParams(DEFAULT_PRESET.params);
    refreshPresetSelect();
    setStatus("Preset is incompatible with current model. Reset to defaults.");
    return;
  }
  loadParams(preset);
  setStatus(`Loaded preset: ${name}`);
});

deletePresetBtn.addEventListener("click", () => {
  const name = presetSelectEl.value;
  if (!deletePreset(name)) {
    setStatus("Cannot delete this preset.");
    return;
  }
  refreshPresetSelect();
  setStatus(`Deleted preset: ${name}`);
  queueRegenerate();
});

exportBodyBtn.addEventListener("click", () => {
  if (!currentModel) {
    setStatus("No valid model to export.");
    return;
  }
  exportStl("project-box-body.stl", currentModel.body);
  setStatus("Downloaded body STL.");
});

exportLidBtn.addEventListener("click", () => {
  if (!currentModel) {
    setStatus("No valid model to export.");
    return;
  }
  exportStl("project-box-lid.stl", currentModel.lid);
  setStatus("Downloaded lid STL.");
});

exportAllBtn.addEventListener("click", async () => {
  if (!currentModel) {
    setStatus("No valid model to export.");
    return;
  }

  exportStl("project-box-body.stl", currentModel.body);
  await new Promise((resolve) => setTimeout(resolve, 180));
  exportStl("project-box-lid.stl", currentModel.lid);
  setStatus("Downloaded body + lid STL files.");
});

refreshPresetSelect();
syncVentControls();

function hasWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

if (location.protocol === "file:") {
  setStatus("Rendering disabled: run via a local web server, not file:// (example: python3 -m http.server 4173).");
} else if (!hasWebGLSupport()) {
  setStatus("Rendering unavailable: this browser/device does not expose WebGL.");
} else {
  try {
    viewer = createViewer(viewerContainer);
    loadParams(currentParams);
    setStatus("Loaded ESP32 Base defaults. Edit any parameter to regenerate.");
  } catch (err) {
    setStatus(`Viewer init failed: ${String(err)}`);
  }
}
