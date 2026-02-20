import { deriveCenteredStandoffCenters, deriveFit } from "./model/fit.js?v=6";

export function validateParams(params) {
  const errors = [];
  const warnings = [];

  const {
    length,
    width,
    height,
    wallThickness,
    floorThickness,
    cornerRadius,
    lipHeight,
    fitTolerance,
    postDiameter,
    screwHoleDiameter,
    enableCenteredStandoffs,
    standoffHeight,
    standoffDiameter,
    standoffHoleDiameter,
    enableVents,
    ventFront,
    ventBack,
    ventLeft,
    ventRight,
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

  if (screwHoleDiameter >= postDiameter) {
    errors.push("Screw hole diameter must be smaller than post diameter.");
  }

  if (!Number.isFinite(fitTolerance) || fitTolerance <= 0) {
    errors.push("Fit tolerance must be a positive number.");
  } else {
    if (fitTolerance < 0.1 || fitTolerance > 0.6) {
      errors.push("Fit tolerance must be between 0.10 mm and 0.60 mm.");
    } else if (fitTolerance < 0.15 || fitTolerance > 0.4) {
      warnings.push("Fit tolerance outside 0.15-0.40 mm may need print tuning.");
    }
  }

  const fit = deriveFit(params);
  if (!fit.feasible) {
    errors.push("Corner post placement is not feasible. Increase footprint or reduce post diameter/corner radius.");
  }
  if (fit.lipClearance >= wallThickness - 0.2) {
    errors.push("Fit tolerance is too large compared with wall thickness.");
  }
  const lipLength = length - 2 * wallThickness - 2 * fit.lipClearance;
  const lipWidth = width - 2 * wallThickness - 2 * fit.lipClearance;
  if (lipLength <= 2 || lipWidth <= 2) {
    errors.push("Lid lip ring has collapsed. Increase footprint or reduce fit tolerance/wall thickness.");
  }

  const postHeight = height - floorThickness;
  if (postHeight < 4) {
    errors.push("Body is too short for robust corner posts. Increase height or reduce floor thickness.");
  }

  if (enableCenteredStandoffs) {
    if (!Number.isFinite(standoffHeight) || standoffHeight <= 0) {
      errors.push("Standoff height must be a positive number.");
    }
    if (!Number.isFinite(standoffDiameter) || standoffDiameter <= 0) {
      errors.push("Standoff diameter must be a positive number.");
    }
    if (!Number.isFinite(standoffHoleDiameter) || standoffHoleDiameter < 0) {
      errors.push("Standoff hole diameter must be zero or greater.");
    }
    if (!Number.isFinite(params.standoffSpacingX) || params.standoffSpacingX <= 0) {
      errors.push("Standoff spacing X must be a positive number.");
    }
    if (!Number.isFinite(params.standoffSpacingY) || params.standoffSpacingY <= 0) {
      errors.push("Standoff spacing Y must be a positive number.");
    }
    if (standoffHoleDiameter > 0 && standoffHoleDiameter >= standoffDiameter) {
      errors.push("Standoff hole diameter must be smaller than standoff diameter.");
    }
    if (standoffHeight < 2) {
      errors.push("Standoff height must be at least 2 mm.");
    }
    if (standoffHeight > innerHeight - 1) {
      errors.push("Standoff height is too tall for the current interior height.");
    }

    const standoffCenters = deriveCenteredStandoffCenters(params);
    const maxX = innerLength / 2 - 0.2;
    const maxY = innerWidth / 2 - 0.2;
    const standoffRadius = standoffDiameter / 2;
    for (const center of standoffCenters) {
      if (Math.abs(center.x) + standoffRadius > maxX || Math.abs(center.y) + standoffRadius > maxY) {
        errors.push("Centered standoffs do not fit inside the internal cavity. Reduce spacing or diameter.");
        break;
      }
    }

    if (standoffHoleDiameter > 0) {
      const standoffWall = (standoffDiameter - standoffHoleDiameter) / 2;
      if (standoffWall < 0.8) {
        warnings.push("Standoff wall thickness below 0.8 mm may be fragile.");
      }
    }
  }

  if (wallThickness < 1.6) {
    warnings.push("Wall thickness below 1.6 mm may be fragile on FDM prints.");
  }

  if (floorThickness < 2) {
    warnings.push("Floor thickness below 2.0 mm may flex under mounted components.");
  }

  if (enableVents) {
    if (!ventFront && !ventBack && !ventLeft && !ventRight) {
      warnings.push("No vent face selected. Front vents will be used.");
    }
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
