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
  enableVents: false,
  ventFront: true,
  ventBack: false,
  ventLeft: false,
  ventRight: false,
  ventCount: 6,
  ventWidth: 1.6,
  ventSpacing: 1.2
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
  "standoffSpacingY",
  "ventCount",
  "ventWidth",
  "ventSpacing"
];

export function readParamsFromForm(form) {
  const data = new FormData(form);
  const next = { ...DEFAULT_PARAMS };

  for (const key of NUMERIC_FIELDS) {
    const raw = data.get(key);
    next[key] = Number(raw);
  }

  next.countersink = data.get("countersink") === "on";
  next.enableCenteredStandoffs = data.get("enableCenteredStandoffs") === "on";
  next.enableVents = data.get("enableVents") === "on";
  next.ventFront = data.get("ventFront") === "on";
  next.ventBack = data.get("ventBack") === "on";
  next.ventLeft = data.get("ventLeft") === "on";
  next.ventRight = data.get("ventRight") === "on";
  if (next.enableVents && !next.ventFront && !next.ventBack && !next.ventLeft && !next.ventRight) {
    next.ventFront = true;
    const ventFrontEl = form.elements.namedItem("ventFront");
    if (ventFrontEl && "checked" in ventFrontEl) {
      ventFrontEl.checked = true;
    }
  }
  next.ventCount = Math.round(next.ventCount);

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
