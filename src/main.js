import { buildAssembly } from "./model/box.js?v=16";
import { exportStl } from "./export.js?v=16";
import { DEFAULT_PRESET, deletePreset, listPresets, loadPreset, savePreset } from "./presets.js?v=16";
import {
  DEFAULT_PARAMS,
  readParamsFromForm,
  writeParamsToForm
} from "./state.js?v=16";
import { validateParams } from "./validators.js?v=16";
import { createViewer } from "./viewer.js?v=16";

const FACES = ["front", "back", "left", "right"];

function capFace(face) {
  return face.charAt(0).toUpperCase() + face.slice(1);
}

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
const viewerOverlayEl = document.querySelector("#viewer-overlay");
const viewerOverlayDetailEl = document.querySelector("#viewer-overlay-detail");

function faceEls(face) {
  const suffix = capFace(face);
  return {
    editToggle: form.elements.namedItem(`faceEdit${suffix}`),
    block: document.querySelector(`.face-editor[data-face="${face}"]`),
    ventEnabled: form.elements.namedItem(`vent${suffix}Enabled`),
    ventParams: document.querySelector(`.face-vent-params[data-face="${face}"]`),
    ventCount: form.elements.namedItem(`vent${suffix}Count`),
    ventWidth: form.elements.namedItem(`vent${suffix}Width`),
    ventSpacing: form.elements.namedItem(`vent${suffix}Spacing`),
    wireEnabled: form.elements.namedItem(`wire${suffix}`),
    wireParams: document.querySelector(`.face-cutout-params[data-face="${face}"]`),
    wireProfile: form.elements.namedItem(`wire${suffix}Profile`),
    wireRoundDiameter: form.elements.namedItem(`wire${suffix}RoundDiameter`),
    wireRectWidth: form.elements.namedItem(`wire${suffix}RectWidth`),
    wireRectHeight: form.elements.namedItem(`wire${suffix}RectHeight`),
    wireOffsetH: form.elements.namedItem(`wire${suffix}OffsetH`),
    wireOffsetV: form.elements.namedItem(`wire${suffix}OffsetV`),
    roundSection: document.querySelector(`.wire-round-geometry[data-face="${face}"]`),
    rectSection: document.querySelector(`.wire-rect-geometry[data-face="${face}"]`)
  };
}

const perFace = Object.fromEntries(FACES.map((face) => [face, faceEls(face)]));

let currentParams = { ...DEFAULT_PARAMS, ...DEFAULT_PRESET.params };
let currentModel = null;
let debounceTimer = null;
let viewer = null;
let lastTouchedFieldName = "";
let activeFieldHintEl = null;

function clearFieldHint() {
  if (activeFieldHintEl && activeFieldHintEl.parentNode) {
    activeFieldHintEl.parentNode.removeChild(activeFieldHintEl);
  }
  activeFieldHintEl = null;
}

function showFieldHint(fieldName, text) {
  clearFieldHint();
  if (!fieldName || !text) return;

  const target = form.elements.namedItem(fieldName);
  if (!target || target instanceof RadioNodeList) return;

  const label = target.closest("label");
  if (!label) return;

  const hint = document.createElement("span");
  hint.className = "field-hint";
  hint.textContent = text;
  label.insertAdjacentElement("afterend", hint);
  activeFieldHintEl = hint;
}

function setOverlayState(visible, detail = "") {
  if (!viewerOverlayEl || !viewerOverlayDetailEl) return;
  viewerOverlayEl.hidden = !visible;
  viewerOverlayDetailEl.textContent = detail || "Fix highlighted settings to continue preview updates.";
}

function syncFaceControls() {
  for (const face of FACES) {
    const els = perFace[face];
    const editVisible = Boolean(els.editToggle?.checked);
    if (els.block) {
      els.block.hidden = !editVisible;
    }
    if (els.ventEnabled && "disabled" in els.ventEnabled) {
      els.ventEnabled.disabled = !editVisible;
    }
    if (els.wireEnabled && "disabled" in els.wireEnabled) {
      els.wireEnabled.disabled = !editVisible;
    }

    const ventOn = editVisible && Boolean(els.ventEnabled?.checked);
    if (els.ventParams) {
      els.ventParams.hidden = !ventOn;
    }
    if (els.ventCount && "disabled" in els.ventCount) els.ventCount.disabled = !ventOn;
    if (els.ventWidth && "disabled" in els.ventWidth) els.ventWidth.disabled = !ventOn;
    if (els.ventSpacing && "disabled" in els.ventSpacing) els.ventSpacing.disabled = !ventOn;

    const wireOn = editVisible && Boolean(els.wireEnabled?.checked);
    if (els.wireParams) {
      els.wireParams.hidden = !wireOn;
    }
    const profile = String(els.wireProfile?.value || "rect");
    if (els.roundSection) {
      els.roundSection.hidden = profile !== "round";
    }
    if (els.rectSection) {
      els.rectSection.hidden = profile !== "rect";
    }

    if (els.wireProfile && "disabled" in els.wireProfile) els.wireProfile.disabled = !wireOn;
    if (els.wireOffsetH && "disabled" in els.wireOffsetH) els.wireOffsetH.disabled = !wireOn;
    if (els.wireOffsetV && "disabled" in els.wireOffsetV) els.wireOffsetV.disabled = !wireOn;
    if (els.wireRoundDiameter && "disabled" in els.wireRoundDiameter) {
      els.wireRoundDiameter.disabled = !wireOn || profile !== "round";
    }
    if (els.wireRectWidth && "disabled" in els.wireRectWidth) {
      els.wireRectWidth.disabled = !wireOn || profile !== "rect";
    }
    if (els.wireRectHeight && "disabled" in els.wireRectHeight) {
      els.wireRectHeight.disabled = !wireOn || profile !== "rect";
    }
  }
}

function renderMessages(messages, level = "error") {
  errorsEl.innerHTML = "";
  for (const msg of messages) {
    const item = document.createElement("li");
    item.textContent = msg;
    item.className = level;
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

function mapMessageToField(message) {
  const lower = String(message || "").toLowerCase();
  const face = FACES.find((f) => lower.includes(f));
  if (face) {
    const suffix = capFace(face);
    if (lower.includes("vent count")) return `vent${suffix}Count`;
    if (lower.includes("vent width")) return `vent${suffix}Width`;
    if (lower.includes("vent spacing")) return `vent${suffix}Spacing`;
    if (lower.includes("horizontal")) return `wire${suffix}OffsetH`;
    if (lower.includes("vertical") || lower.includes("floor") || lower.includes("top-edge") || lower.includes("top edge")) return `wire${suffix}OffsetV`;
    if (lower.includes("round diameter")) return `wire${suffix}RoundDiameter`;
    if (lower.includes("width")) return `wire${suffix}RectWidth`;
    if (lower.includes("height")) return `wire${suffix}RectHeight`;
    if (lower.includes("profile")) return `wire${suffix}Profile`;
  }
  return lastTouchedFieldName || "";
}

function regenerate() {
  if (!viewer) return;

  const nextParams = readParamsFromForm(form);
  updateInnerSummary(nextParams);
  const check = validateParams(nextParams);

  if (!check.valid) {
    renderMessages(check.errors, "error");
    setOverlayState(true, check.errors[0]);
    showFieldHint(mapMessageToField(check.errors[0]), check.errors[0]);
    setStatus("Invalid parameters. Previous valid model is shown.");
    return;
  }

  try {
    const assembly = buildAssembly(nextParams);
    const tri = viewer.update(assembly);

    currentParams = nextParams;
    currentModel = assembly;

    renderMessages(check.warnings, "info");
    setOverlayState(false);
    clearFieldHint();

    setStatus(
      `Model updated. Body: ${Math.round(tri.bodyTriangles)} tris, Lid: ${Math.round(tri.lidTriangles)} tris.`
    );
  } catch (err) {
    renderMessages(["Geometry generation failed."], "error");
    setOverlayState(true, "Geometry generation failed. Adjust the last edited settings.");
    showFieldHint(lastTouchedFieldName, "Geometry failed from this setting combination.");
    setStatus(String(err));
  }
}

function queueRegenerate() {
  if (!viewer) return;
  syncFaceControls();
  setStatus("Regenerating...");
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(regenerate, 250);
}

function loadParams(params) {
  writeParamsToForm(form, params);
  syncFaceControls();
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

function handleFormInteraction(event) {
  const target = event.target;
  if (target && "name" in target && typeof target.name === "string" && target.name) {
    lastTouchedFieldName = target.name;
  }
  queueRegenerate();
}

form.addEventListener("input", handleFormInteraction);
form.addEventListener("change", handleFormInteraction);

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
syncFaceControls();

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
