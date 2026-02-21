import {
  booleans,
  extrusions,
  primitives,
  transforms
} from "https://esm.sh/@jscad/modeling@2.12.6";
import {
  deriveCenteredStandoffCenters,
  deriveFit,
  deriveTrimmedVentSlotsByFace,
  deriveVentSlotCentersZForFace,
  deriveWireCutoutSpecForFace
} from "./fit.js?v=16";

const { subtract, union } = booleans;
const { roundedRectangle, cylinder, cylinderElliptic, cuboid } = primitives;
const { extrudeLinear } = extrusions;
const { rotateX, rotateY, translate } = transforms;

function safeRadius(sizeA, sizeB, desired, sizeC = Infinity) {
  const lim = Math.max(0, Math.min(sizeA, sizeB, sizeC) / 2 - 0.01);
  return Math.min(Math.max(0, desired), lim);
}

function roundedPrism(sizeX, sizeY, sizeZ, radius) {
  const rr = roundedRectangle({
    size: [sizeX, sizeY],
    roundRadius: safeRadius(sizeX, sizeY, radius),
    segments: 32
  });
  const prism = extrudeLinear({ height: sizeZ }, rr);
  return translate([0, 0, -sizeZ / 2], prism);
}

export function makeRoundedShell({ length, width, height, wallThickness, floorThickness, cornerRadius }) {
  const outer = roundedPrism(length, width, height, cornerRadius);

  const innerLength = length - 2 * wallThickness;
  const innerWidth = width - 2 * wallThickness;
  const innerHeight = height - floorThickness;
  const innerRadius = safeRadius(innerLength, innerWidth, cornerRadius - wallThickness);

  const inner = translate([0, 0, floorThickness / 2], roundedPrism(innerLength, innerWidth, innerHeight, innerRadius));

  return subtract(outer, inner);
}

export function makePosts(params) {
  const {
    length,
    width,
    wallThickness,
    height,
    floorThickness,
    postDiameter,
    screwHoleDiameter
  } = params;
  const { postCenters } = deriveFit(params);

  // Run posts flush to the body top rim.
  const postHeight = Math.max(4, height - floorThickness);
  const bottomZ = -height / 2 + floorThickness;
  const postCenterZ = bottomZ + postHeight / 2;
  const holeHeight = Math.max(2, postHeight - 1);
  const holeCenterZ = bottomZ + 1 + holeHeight / 2;

  const posts = [];
  const braces = [];
  const holes = [];
  const braceThickness = Math.max(1.2, postDiameter * 0.45);

  for (const center of postCenters) {
    posts.push(
      translate(
        [center.x, center.y, postCenterZ],
        cylinder({ radius: postDiameter / 2, height: postHeight, segments: 36 })
      )
    );

    const xSign = Math.sign(center.x) || 1;
    const ySign = Math.sign(center.y) || 1;
    const xWallCenter = xSign * (length / 2 - wallThickness / 2);
    const yWallCenter = ySign * (width / 2 - wallThickness / 2);
    const xBridgeLen = Math.max(0.4, Math.abs(xWallCenter - center.x));
    const yBridgeLen = Math.max(0.4, Math.abs(yWallCenter - center.y));

    // Tie posts into nearby side walls for strength and easier printing.
    braces.push(
      translate(
        [center.x + xSign * xBridgeLen / 2, center.y, postCenterZ],
        cuboid({ size: [xBridgeLen, braceThickness, postHeight] })
      )
    );
    braces.push(
      translate(
        [center.x, center.y + ySign * yBridgeLen / 2, postCenterZ],
        cuboid({ size: [braceThickness, yBridgeLen, postHeight] })
      )
    );

    holes.push(
      translate(
        [center.x, center.y, holeCenterZ],
        cylinder({ radius: screwHoleDiameter / 2, height: holeHeight + 0.2, segments: 32 })
      )
    );
  }

  return subtract(union(...posts, ...braces), union(...holes));
}

export function makeCenteredStandoffs(params) {
  const {
    height,
    floorThickness,
    standoffDiameter,
    standoffHeight,
    standoffHoleDiameter
  } = params;
  const standoffCenters = deriveCenteredStandoffCenters(params);

  const bottomZ = -height / 2 + floorThickness;
  const standoffCenterZ = bottomZ + standoffHeight / 2;
  const holeCenterZ = bottomZ + standoffHeight / 2;

  const standoffs = [];
  const holes = [];
  const hasHole = standoffHoleDiameter > 0;

  for (const center of standoffCenters) {
    standoffs.push(
      translate(
        [center.x, center.y, standoffCenterZ],
        cylinder({ radius: standoffDiameter / 2, height: standoffHeight, segments: 36 })
      )
    );

    if (hasHole) {
      holes.push(
        translate(
          [center.x, center.y, holeCenterZ],
          cylinder({ radius: standoffHoleDiameter / 2, height: standoffHeight + 0.3, segments: 32 })
        )
      );
    }
  }

  if (!hasHole) {
    return union(...standoffs);
  }

  return subtract(union(...standoffs), union(...holes));
}

export function cutVents(bodyGeom, params) {
  const {
    length,
    width,
    wallThickness
  } = params;

  const trimmedByFace = deriveTrimmedVentSlotsByFace(params, 1.2);
  const cuts = [];
  const faces = ["front", "back", "left", "right"];
  for (const face of faces) {
    const suffix = face.charAt(0).toUpperCase() + face.slice(1);
    if (!params[`faceEdit${suffix}`] || !params[`vent${suffix}Enabled`]) continue;
    const slotLength = (face === "front" || face === "back")
      ? Math.max(10, length - 20)
      : Math.max(10, width - 20);
    const slotCenters = deriveVentSlotCentersZForFace(params, face);
    const ventWidth = Number(params[`vent${suffix}Width`]);

    const keptIndices = trimmedByFace[face] || [];
    for (const i of keptIndices) {
      const z = slotCenters[i];
      if (!Number.isFinite(z)) continue;

      if (face === "front" || face === "back") {
        const y = face === "front" ? width / 2 - wallThickness / 2 : -width / 2 + wallThickness / 2;
        cuts.push(
          translate(
            [0, y, z],
            cuboid({ size: [slotLength, wallThickness + 2, ventWidth] })
          )
        );
      } else {
        const x = face === "right" ? length / 2 - wallThickness / 2 : -length / 2 + wallThickness / 2;
        cuts.push(
          translate(
            [x, 0, z],
            cuboid({ size: [wallThickness + 2, slotLength, ventWidth] })
          )
        );
      }
    }
  }

  if (cuts.length === 0) return bodyGeom;
  return subtract(bodyGeom, union(...cuts));
}

export function cutWireCutouts(bodyGeom, params) {
  const { wallThickness } = params;
  const cutDepth = wallThickness + 2;
  const cuts = [];
  const faces = ["front", "back", "left", "right"];

  for (const face of faces) {
    const spec = deriveWireCutoutSpecForFace(params, face);
    if (!spec.enabled) continue;

    let cut = null;
    if (spec.profile === "round") {
      const round = cylinder({ radius: spec.width / 2, height: cutDepth, segments: 48 });
      cut = spec.isFrontBack ? rotateX(Math.PI / 2, round) : rotateY(Math.PI / 2, round);
    } else if (spec.isFrontBack) {
      cut = cuboid({ size: [spec.width, cutDepth, spec.height] });
    } else {
      cut = cuboid({ size: [cutDepth, spec.width, spec.height] });
    }

    if (spec.isFrontBack) {
      cuts.push(translate([spec.center.x, spec.center.y, spec.center.z], cut));
    } else {
      cuts.push(translate([spec.center.x, spec.center.y, spec.center.z], cut));
    }
  }

  if (cuts.length === 0) return bodyGeom;
  return subtract(bodyGeom, union(...cuts));
}

export function makeLidPlate(params) {
  const { length, width, lidThickness, cornerRadius } = params;
  return roundedPrism(length, width, lidThickness, cornerRadius);
}

export function makeLidLip(params) {
  const {
    length,
    width,
    wallThickness,
    lipHeight,
    cornerRadius,
    lidThickness,
    postDiameter
  } = params;
  const { lipClearance, fitTolerance } = deriveFit(params);

  const lipLength = length - 2 * wallThickness - 2 * lipClearance;
  const lipWidth = width - 2 * wallThickness - 2 * lipClearance;
  const lipOuter = roundedPrism(
    lipLength,
    lipWidth,
    lipHeight,
    cornerRadius - wallThickness - lipClearance
  );

  // Build a perimeter ring lip (not a solid plug) so the lid can seat flush.
  const lipWall = Math.max(1, Math.min(wallThickness, Math.min(lipLength, lipWidth) / 4));
  const innerLipLength = lipLength - 2 * lipWall;
  const innerLipWidth = lipWidth - 2 * lipWall;

  let lip = lipOuter;
  if (innerLipLength > 1 && innerLipWidth > 1) {
    const lipInner = roundedPrism(
      innerLipLength,
      innerLipWidth,
      lipHeight + 0.2,
      cornerRadius - wallThickness - lipClearance - lipWall
    );
    lip = subtract(lipOuter, lipInner);
  }

  // Corner notches keep the lip from bearing on corner posts; lid seats on rim/holes instead.
  const notchSize = Math.max(
    postDiameter + 2 * fitTolerance + 0.4,
    (postDiameter / 2 + fitTolerance + 0.25) * 1.6
  );
  const notchW = Math.min(lipLength - 0.8, notchSize);
  const notchH = Math.min(lipWidth - 0.8, notchSize);

  if (notchW > 0.6 && notchH > 0.6) {
    const cornerCuts = [];
    const sx = [-1, 1];
    const sy = [-1, 1];
    for (const ix of sx) {
      for (const iy of sy) {
        cornerCuts.push(
          translate(
            [ix * (lipLength / 2 - notchW / 2), iy * (lipWidth / 2 - notchH / 2), 0],
            cuboid({ size: [notchW, notchH, lipHeight + 0.4] })
          )
        );
      }
    }
    lip = subtract(lip, union(...cornerCuts));
  }

  return translate([0, 0, -(lidThickness / 2 + lipHeight / 2)], lip);
}

export function makeLidHoles(lidGeom, params) {
  const {
    screwHoleDiameter,
    lidThickness,
    lipHeight,
    countersink
  } = params;
  const { postCenters } = deriveFit(params);

  const throughHoles = [];
  const sinks = [];
  const sinkDepth = 1.6;
  const sinkHeadDiameter = screwHoleDiameter * 1.9;

  for (const center of postCenters) {
    throughHoles.push(
      translate(
        [center.x, center.y, -lipHeight / 2],
        cylinder({ radius: screwHoleDiameter / 2, height: lidThickness + lipHeight + 2, segments: 32 })
      )
    );

    if (countersink) {
      sinks.push(
        translate(
          [center.x, center.y, lidThickness / 2 - sinkDepth / 2],
          cylinderElliptic({
            // Top-side taper for flat-head screws.
            height: sinkDepth,
            startRadius: [screwHoleDiameter / 2, screwHoleDiameter / 2],
            endRadius: [sinkHeadDiameter / 2, sinkHeadDiameter / 2],
            segments: 32
          })
        )
      );
    }
  }

  const cuts = sinks.length
    ? union(union(...throughHoles), union(...sinks))
    : union(...throughHoles);
  return subtract(lidGeom, cuts);
}
