import { booleans, transforms } from "https://esm.sh/@jscad/modeling@2.12.6";
import {
  cutWireCutouts,
  cutVents,
  makeCenteredStandoffs,
  makeLidHoles,
  makeLidLip,
  makeLidPlate,
  makePosts,
  makeRoundedShell
} from "./features.js?v=16";

const { union } = booleans;
const { rotateX, translate } = transforms;

export function buildBody(params) {
  let body = makeRoundedShell(params);
  body = union(body, makePosts(params));
  if (params.enableCenteredStandoffs) {
    body = union(body, makeCenteredStandoffs(params));
  }

  body = cutVents(body, params);
  body = cutWireCutouts(body, params);

  return body;
}

export function buildLid(params) {
  const plate = makeLidPlate(params);
  const lip = makeLidLip(params);
  const raw = union(plate, lip);
  return makeLidHoles(raw, params);
}

export function buildAssembly(params) {
  const body = buildBody(params);
  const lid = buildLid(params);

  // Keep export geometry untouched; transform only preview placement.
  const previewBody = translate([0, 0, params.height / 2], body);
  const upsideDownLid = rotateX(Math.PI, lid);
  const sideOffset = params.length / 2 + params.length * 0.55;
  const previewLid = translate(
    [sideOffset, 0, params.lidThickness / 2],
    upsideDownLid
  );

  return { body, lid, previewBody, previewLid };
}
