const FACES = ["front", "back", "left", "right"];

function capFace(face) {
  return face.charAt(0).toUpperCase() + face.slice(1);
}

function clampFace(face) {
  return FACES.includes(face) ? face : "back";
}

export function deriveFit(params) {
  const fitTolerance = Number.isFinite(params.fitTolerance)
    ? params.fitTolerance
    : (Number.isFinite(params.lipClearance) ? params.lipClearance : 0.25);

  const safety = 0;
  const postRadius = params.postDiameter / 2;

  const innerLength = params.length - 2 * params.wallThickness;
  const innerWidth = params.width - 2 * params.wallThickness;
  const innerRadius = Math.max(
    0,
    Math.min(
      Math.min(innerLength, innerWidth) / 2 - 0.01,
      params.cornerRadius - params.wallThickness
    )
  );

  const wallEmbed = Math.min(params.wallThickness * 0.8, postRadius * 0.6);
  const wallInsetMin = params.wallThickness + postRadius - wallEmbed;

  let cornerInsetMin = wallInsetMin;
  if (innerRadius > postRadius + safety) {
    const minInsetFromInnerWall =
      innerRadius - (innerRadius - postRadius - safety) / Math.SQRT2;
    cornerInsetMin = Math.max(cornerInsetMin, params.wallThickness + minInsetFromInnerWall);
  }

  const maxInset = Math.min(params.length, params.width) / 2 - postRadius - safety;
  const feasible = maxInset >= cornerInsetMin;

  const postInset = feasible ? cornerInsetMin : maxInset;
  const x = params.length / 2 - postInset;
  const y = params.width / 2 - postInset;

  return {
    fitTolerance,
    lipClearance: fitTolerance,
    postInset,
    feasible,
    postCenters: [
      { x: -x, y: -y },
      { x: -x, y },
      { x, y: -y },
      { x, y }
    ]
  };
}

export function deriveCenteredStandoffCenters(params) {
  const x = params.standoffSpacingX / 2;
  const y = params.standoffSpacingY / 2;

  return [
    { x: -x, y: -y },
    { x: -x, y },
    { x, y: -y },
    { x, y }
  ];
}

export function deriveVentSlotCentersZForFace(params, faceRaw) {
  const face = clampFace(faceRaw);
  const suffix = capFace(face);
  const count = Math.max(0, Math.round(Number(params[`vent${suffix}Count`])));
  const width = Number(params[`vent${suffix}Width`]);
  const spacing = Number(params[`vent${suffix}Spacing`]);
  if (count === 0 || !Number.isFinite(width) || !Number.isFinite(spacing)) return [];

  const usableHeight = params.height - params.floorThickness - 8;
  const totalVentHeight = count * width + (count - 1) * spacing;
  const startZ = -params.height / 2 + params.floorThickness + 4 + (usableHeight - totalVentHeight) / 2;

  return Array.from({ length: count }, (_, i) => (
    startZ + i * (width + spacing) + width / 2
  ));
}

export function deriveWireCutoutSpecForFace(params, faceRaw) {
  const face = clampFace(faceRaw);
  const suffix = capFace(face);
  const profileRaw = String(params[`wire${suffix}Profile`] || "");
  const profile = (profileRaw === "round" || profileRaw === "rect") ? profileRaw : "rect";

  let width = Number(params[`wire${suffix}RectWidth`]);
  let height = Number(params[`wire${suffix}RectHeight`]);
  if (profile === "round") {
    width = Number(params[`wire${suffix}RoundDiameter`]);
    height = width;
  }

  const offsetH = Number(params[`wire${suffix}OffsetH`]);
  const offsetV = Number(params[`wire${suffix}OffsetV`]);
  const bottomZ = -params.height / 2 + params.floorThickness;
  const baseCenterZ = Math.max(bottomZ + 5, bottomZ + params.wallThickness + height / 2 + 1);
  const z = baseCenterZ + offsetV;

  const isFrontBack = face === "front" || face === "back";
  const y = face === "front"
    ? params.width / 2 - params.wallThickness / 2
    : (face === "back" ? -params.width / 2 + params.wallThickness / 2 : offsetH);
  const x = face === "right"
    ? params.length / 2 - params.wallThickness / 2
    : (face === "left" ? -params.length / 2 + params.wallThickness / 2 : offsetH);

  return {
    face,
    enabled: Boolean(params[`wire${suffix}`]),
    profile,
    width,
    height,
    offsetH,
    offsetV,
    center: { x, y, z },
    isFrontBack,
    horizontalSpan: isFrontBack ? params.length : params.width,
    cutBottom: z - height / 2,
    cutTop: z + height / 2
  };
}

export function deriveTrimmedVentSlotsByFace(params, minWeb = 1.2) {
  const result = {
    front: [],
    back: [],
    left: [],
    right: []
  };

  for (const face of FACES) {
    const suffix = capFace(face);
    if (!params[`vent${suffix}Enabled`]) continue;

    const slotCenters = deriveVentSlotCentersZForFace(params, face);
    const slotCount = slotCenters.length;
    const allIndices = Array.from({ length: slotCount }, (_, i) => i);
    if (slotCount === 0) {
      result[face] = [];
      continue;
    }

    const wireSpec = deriveWireCutoutSpecForFace(params, face);
    if (!wireSpec.enabled) {
      result[face] = allIndices;
      continue;
    }

    const slotHalf = Number(params[`vent${suffix}Width`]) / 2;
    const forbiddenBottom = wireSpec.cutBottom - minWeb;
    const forbiddenTop = wireSpec.cutTop + minWeb;

    const kept = [];
    for (let i = 0; i < slotCount; i += 1) {
      const z = slotCenters[i];
      const slotBottom = z - slotHalf;
      const slotTop = z + slotHalf;
      const conflicts = !(slotTop < forbiddenBottom || slotBottom > forbiddenTop);
      if (!conflicts) kept.push(i);
    }
    result[face] = kept;
  }

  return result;
}
