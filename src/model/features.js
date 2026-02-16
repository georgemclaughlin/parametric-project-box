import {
  booleans,
  extrusions,
  primitives,
  transforms
} from "https://esm.sh/@jscad/modeling@2.12.6";

const { subtract, union } = booleans;
const { roundedRectangle, cylinder, cuboid } = primitives;
const { extrudeLinear } = extrusions;
const { translate } = transforms;

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
    height,
    floorThickness,
    postDiameter,
    screwHoleDiameter,
    postOffset
  } = params;

  const postHeight = Math.max(4, height - floorThickness - 2);
  const bottomZ = -height / 2 + floorThickness;
  const postCenterZ = bottomZ + postHeight / 2;
  const holeHeight = Math.max(2, postHeight - 1);
  const holeCenterZ = bottomZ + 1 + holeHeight / 2;

  const xs = [-(length / 2 - postOffset), length / 2 - postOffset];
  const ys = [-(width / 2 - postOffset), width / 2 - postOffset];

  const posts = [];
  const holes = [];

  for (const x of xs) {
    for (const y of ys) {
      posts.push(
        translate(
          [x, y, postCenterZ],
          cylinder({ radius: postDiameter / 2, height: postHeight, segments: 36 })
        )
      );

      holes.push(
        translate(
          [x, y, holeCenterZ],
          cylinder({ radius: screwHoleDiameter / 2, height: holeHeight + 0.2, segments: 32 })
        )
      );
    }
  }

  return subtract(union(...posts), union(...holes));
}

export function cutVents(bodyGeom, params) {
  const {
    length,
    width,
    height,
    wallThickness,
    floorThickness,
    ventFace,
    ventCount,
    ventWidth,
    ventSpacing
  } = params;

  const usableHeight = height - floorThickness - 8;
  const totalVentHeight = ventCount * ventWidth + (ventCount - 1) * ventSpacing;
  const startZ = -height / 2 + floorThickness + 4 + (usableHeight - totalVentHeight) / 2;

  const slotLength = (ventFace === "front" || ventFace === "back")
    ? Math.max(10, length - 20)
    : Math.max(10, width - 20);

  const cuts = [];

  for (let i = 0; i < ventCount; i += 1) {
    const z = startZ + i * (ventWidth + ventSpacing) + ventWidth / 2;

    if (ventFace === "front" || ventFace === "back") {
      const y = ventFace === "front" ? width / 2 - wallThickness / 2 : -width / 2 + wallThickness / 2;
      cuts.push(
        translate(
          [0, y, z],
          cuboid({ size: [slotLength, wallThickness + 2, ventWidth] })
        )
      );
    } else {
      const x = ventFace === "right" ? length / 2 - wallThickness / 2 : -length / 2 + wallThickness / 2;
      cuts.push(
        translate(
          [x, 0, z],
          cuboid({ size: [wallThickness + 2, slotLength, ventWidth] })
        )
      );
    }
  }

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
    lipClearance,
    lipHeight,
    cornerRadius,
    lidThickness
  } = params;

  const lipLength = length - 2 * wallThickness - 2 * lipClearance;
  const lipWidth = width - 2 * wallThickness - 2 * lipClearance;
  const lip = roundedPrism(
    lipLength,
    lipWidth,
    lipHeight,
    cornerRadius - wallThickness - lipClearance
  );

  return translate([0, 0, -(lidThickness / 2 + lipHeight / 2)], lip);
}

export function makeLidHoles(lidGeom, params) {
  const {
    length,
    width,
    postOffset,
    screwHoleDiameter,
    lidThickness,
    lipHeight,
    countersink
  } = params;

  const xs = [-(length / 2 - postOffset), length / 2 - postOffset];
  const ys = [-(width / 2 - postOffset), width / 2 - postOffset];

  const throughHoles = [];
  const sinks = [];
  const sinkDepth = 1.6;
  const sinkHeadDiameter = screwHoleDiameter * 1.9;

  for (const x of xs) {
    for (const y of ys) {
      throughHoles.push(
        translate(
          [x, y, -lipHeight / 2],
          cylinder({ radius: screwHoleDiameter / 2, height: lidThickness + lipHeight + 2, segments: 32 })
        )
      );

      if (countersink) {
        sinks.push(
          translate(
            [x, y, lidThickness / 2 - sinkDepth / 2],
            cylinder({
              // Cut a top-side cone so flat-head screws can sit lower.
              height: sinkDepth,
              startRadius: screwHoleDiameter / 2,
              endRadius: sinkHeadDiameter / 2,
              segments: 32
            })
          )
        );
      }
    }
  }

  const cuts = sinks.length
    ? union(union(...throughHoles), union(...sinks))
    : union(...throughHoles);
  return subtract(lidGeom, cuts);
}
