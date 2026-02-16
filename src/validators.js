export function validateParams(params) {
  const errors = [];
  const warnings = [];

  const {
    length,
    width,
    height,
    wallThickness,
    floorThickness,
    lidThickness,
    cornerRadius,
    lipHeight,
    lipClearance,
    postDiameter,
    screwHoleDiameter,
    postOffset,
    enableVents,
    ventCount,
    ventWidth,
    ventSpacing
  } = params;

  const innerLength = length - 2 * wallThickness;
  const innerWidth = width - 2 * wallThickness;
  const innerHeight = height - floorThickness;

  if (innerLength <= 1 || innerWidth <= 1 || innerHeight <= 2) {
    errors.push("Interior cavity is too small. Increase dimensions or reduce wall/floor thickness.");
  }

  const maxCorner = Math.min(length, width) / 2 - 0.5;
  if (cornerRadius > maxCorner) {
    errors.push(`Corner radius is too large. Maximum is ${maxCorner.toFixed(2)} mm for this footprint.`);
  }

  if (lipHeight >= innerHeight - 0.6) {
    errors.push("Lip height is too tall for the current interior height.");
  }

  if (lipClearance >= wallThickness - 0.2) {
    errors.push("Lip clearance is too large compared with wall thickness.");
  }

  if (screwHoleDiameter >= postDiameter) {
    errors.push("Screw hole diameter must be smaller than post diameter.");
  }

  const maxPostOffset = Math.min(length, width) / 2 - wallThickness - postDiameter / 2;
  if (postOffset > maxPostOffset) {
    errors.push(`Post offset is too large. Keep it at or below ${Math.max(0, maxPostOffset).toFixed(2)} mm.`);
  }

  const postReachX = length / 2 - postOffset;
  const postReachY = width / 2 - postOffset;
  if (postReachX - postDiameter / 2 <= wallThickness || postReachY - postDiameter / 2 <= wallThickness) {
    errors.push("Posts are colliding with walls. Reduce post diameter or post offset.");
  }

  if (wallThickness < 1.6) {
    warnings.push("Wall thickness below 1.6 mm may be fragile on FDM prints.");
  }

  if (floorThickness < 2) {
    warnings.push("Floor thickness below 2.0 mm may flex under mounted components.");
  }

  if (enableVents) {
    const ventStackHeight = ventCount * ventWidth + (ventCount - 1) * ventSpacing;
    if (ventStackHeight > height - floorThickness - 8) {
      errors.push("Vent stack is too tall for this side wall.");
    }
    if (ventSpacing < 1) {
      warnings.push("Vent spacing below 1.0 mm can weaken side walls.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
