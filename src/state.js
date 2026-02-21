export const USB_C_PRESET_WIDTH = 11;
export const USB_C_PRESET_HEIGHT = 5.5;

const FACE_KEYS = ["Front", "Back", "Left", "Right"];

export const DEFAULT_PARAMS = {
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
};

const NUMERIC_FIELDS = [
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
  "standoffHeight",
  "standoffDiameter",
  "standoffHoleDiameter",
  "standoffSpacingX",
  "standoffSpacingY"
];

for (const face of FACE_KEYS) {
  NUMERIC_FIELDS.push(
    `vent${face}Count`,
    `vent${face}Width`,
    `vent${face}Spacing`,
    `wire${face}RoundDiameter`,
    `wire${face}RectWidth`,
    `wire${face}RectHeight`,
    `wire${face}OffsetH`,
    `wire${face}OffsetV`
  );
}

export function readParamsFromForm(form) {
  const data = new FormData(form);
  const next = { ...DEFAULT_PARAMS };

  for (const key of NUMERIC_FIELDS) {
    const raw = data.get(key);
    next[key] = Number(raw);
  }

  next.countersink = data.get("countersink") === "on";
  next.enableCenteredStandoffs = data.get("enableCenteredStandoffs") === "on";

  for (const face of FACE_KEYS) {
    next[`faceEdit${face}`] = data.get(`faceEdit${face}`) === "on";
    next[`vent${face}Enabled`] = data.get(`vent${face}Enabled`) === "on";
    next[`wire${face}`] = data.get(`wire${face}`) === "on";

    const profileKey = `wire${face}Profile`;
    const profileRaw = String(data.get(profileKey) || "");
    next[profileKey] = (profileRaw === "round" || profileRaw === "rect")
      ? profileRaw
      : DEFAULT_PARAMS[profileKey];

    next[`vent${face}Count`] = Math.round(next[`vent${face}Count`]);
  }

  return next;
}

export function writeParamsToForm(form, params) {
  for (const [key, value] of Object.entries(params)) {
    const el = form.elements.namedItem(key);
    if (!el) continue;

    if (el instanceof RadioNodeList) continue;

    if (el.type === "checkbox") {
      el.checked = Boolean(value);
    } else {
      el.value = String(value);
    }
  }
}
