export function deriveFit(params) {
  const fitTolerance = Number.isFinite(params.fitTolerance)
    ? params.fitTolerance
    : (Number.isFinite(params.lipClearance) ? params.lipClearance : 0.25);

  const safety = 0;
  const postRadius = params.postDiameter / 2;
  const sinkHeadRadius = (params.screwHoleDiameter * 1.9) / 2;
  const sinkSafety = 0.2;

  const innerLength = params.length - 2 * params.wallThickness;
  const innerWidth = params.width - 2 * params.wallThickness;
  const innerRadius = Math.max(
    0,
    Math.min(
      Math.min(innerLength, innerWidth) / 2 - 0.01,
      params.cornerRadius - params.wallThickness
    )
  );

  // Allow partial wall embedding so posts read as corner-integrated supports.
  const wallEmbed = Math.min(params.wallThickness * 0.8, postRadius * 0.6);
  const wallInsetMin = params.wallThickness + postRadius - wallEmbed;

  let cornerInsetMin = wallInsetMin;
  if (innerRadius > postRadius + safety) {
    const minInsetFromInnerWall =
      innerRadius - (innerRadius - postRadius - safety) / Math.SQRT2;
    cornerInsetMin = Math.max(cornerInsetMin, params.wallThickness + minInsetFromInnerWall);
  }

  // Keep enough corner material at lid holes so countersink relief remains effective at defaults.
  const countersinkInsetMin = params.cornerRadius + sinkHeadRadius + sinkSafety;
  cornerInsetMin = Math.max(cornerInsetMin, countersinkInsetMin);

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
