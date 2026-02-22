import * as THREE from "https://esm.sh/three@0.179.1";
import { OrbitControls } from "https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js";
import { geometries } from "https://esm.sh/@jscad/modeling@2.12.6";
import { deriveFit } from "./model/fit.js?v=17";

const { geom3 } = geometries;

function geom3ToBufferGeometry(geom) {
  const polygons = geom3.toPolygons(geom);
  const vertices = [];

  for (const polygon of polygons) {
    const pts = polygon.vertices;
    if (!pts || pts.length < 3) continue;

    for (let i = 1; i < pts.length - 1; i += 1) {
      const tri = [pts[0], pts[i], pts[i + 1]];
      for (const p of tri) {
        vertices.push(p[0], p[1], p[2]);
      }
    }
  }

  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  buffer.computeVertexNormals();
  buffer.computeBoundingSphere();
  return buffer;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function disposeObject3D(object) {
  object.traverse((node) => {
    if (node.geometry) {
      node.geometry.dispose();
    }
    const materials = node.material
      ? (Array.isArray(node.material) ? node.material : [node.material])
      : [];
    for (const mat of materials) {
      if (!mat) continue;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  });
}

function makeLabelSprite(text, colorHex = "#184a5d") {
  const font = "700 38px 'Trebuchet MS', 'Segoe UI', sans-serif";
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;
  measureCtx.font = font;
  const measuredTextWidth = Math.ceil(measureCtx.measureText(text).width);

  const canvas = document.createElement("canvas");
  canvas.width = clamp(measuredTextWidth + 42, 150, 280);
  canvas.height = 92;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.97)";
  ctx.strokeStyle = "rgba(15, 34, 48, 0.88)";
  ctx.lineWidth = 2.5;
  const pad = 6;
  const r = 12;
  const w = canvas.width - 2 * pad;
  const h = canvas.height - 2 * pad;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + w - r, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  ctx.lineTo(pad + w, pad + h - r);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  ctx.lineTo(pad + r, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 25;
  sprite.userData.aspect = canvas.width / canvas.height;
  return sprite;
}

function makeDimensionMaterial(color = 0xff7a00) {
  return new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.6
  });
}

function makeDimensionShaft(start, end, radius = 0.42, color = 0xff7a00) {
  const axis = end.clone().sub(start);
  const length = axis.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, Math.max(0.01, length), 14);
  const material = makeDimensionMaterial(color);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  const up = new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(up, axis.normalize());
  mesh.renderOrder = 20;
  return mesh;
}

function makeArrowCone(tip, direction, size = 2.2, color = 0xff7a00) {
  const geometry = new THREE.ConeGeometry(size * 0.52, size, 16);
  const material = makeDimensionMaterial(color);
  const cone = new THREE.Mesh(geometry, material);
  const dir = direction.clone().normalize();
  // ConeGeometry is centered at origin with its tip at +Y * (height / 2).
  // Shift by half height so the visible tip lands exactly on the target point.
  cone.position.copy(tip).addScaledVector(dir, -size * 0.5);
  const up = new THREE.Vector3(0, 1, 0);
  cone.quaternion.setFromUnitVectors(up, dir);
  cone.renderOrder = 21;
  return cone;
}

function addGuideLine(group, start, end, color = 0x00b894) {
  const span = start.distanceTo(end);
  if (span <= 0.01) return;
  group.add(makeDimensionShaft(start, end, clamp(span * 0.01, 0.14, 0.22), color));
}

function addDimension(group, start, end, labelText, labelScale, options = {}) {
  const color = options.color ?? 0xff7a00;
  const labelColor = options.labelColor ?? "#184a5d";
  const labelLerp = Number.isFinite(options.labelLerp) ? options.labelLerp : 0.5;
  const showArrows = options.showArrows !== false;
  const span = start.distanceTo(end);
  const arrowSize = clamp(span * 0.085, 1.9, 4.8);
  const axisDir = end.clone().sub(start).normalize();
  group.add(makeDimensionShaft(start, end, clamp(span * 0.012, 0.34, 0.65), color));
  if (showArrows) {
    group.add(makeArrowCone(start, axisDir, arrowSize, color));
    group.add(makeArrowCone(end, axisDir.clone().multiplyScalar(-1), arrowSize, color));
  }

  const label = makeLabelSprite(labelText, labelColor);
  if (label) {
    label.position.copy(start).lerp(end, clamp(labelLerp, 0.15, 0.85));
    if (options.labelOffset instanceof THREE.Vector3) {
      label.position.add(options.labelOffset);
    }
    const labelHeight = labelScale * 1.35;
    const labelAspect = Number.isFinite(label.userData.aspect) ? label.userData.aspect : 2.5;
    label.scale.set(labelHeight * labelAspect, labelHeight, 1);
    group.add(label);
  }
}

function makeDimensionOverlay(params) {
  if (!params || !params.showDimensions) return null;

  const innerLength = params.length - 2 * params.wallThickness;
  const innerWidth = params.width - 2 * params.wallThickness;
  const innerHeight = params.height - params.floorThickness;
  if (innerLength <= 0 || innerWidth <= 0 || innerHeight <= 0) return null;

  const zBottom = -params.height / 2 + params.floorThickness;
  const zTop = params.height / 2;
  const xMin = -innerLength / 2;
  const xMax = innerLength / 2;
  const yMin = -innerWidth / 2;
  const yMax = innerWidth / 2;

  const insetX = clamp(innerLength * 0.23, 1.1, Math.max(1.2, innerLength / 2 - 0.5));
  const insetY = clamp(innerWidth * 0.23, 1.1, Math.max(1.2, innerWidth / 2 - 0.5));
  const zBand = clamp(innerHeight * 0.24, 1.0, Math.max(1.1, innerHeight - 0.8));
  const zGuide = clamp(zBottom + zBand, zBottom + 0.5, zTop - 0.5);
  const labelScale = clamp(Math.min(innerLength, innerWidth, innerHeight) * 0.2, 1.35, 4.4);

  const group = new THREE.Group();
  group.name = "dimension-overlay";

  addDimension(
    group,
    new THREE.Vector3(xMin, yMin + insetY, zGuide),
    new THREE.Vector3(xMax, yMin + insetY, zGuide),
    `${innerLength.toFixed(1)} mm`,
    labelScale,
    { showArrows: false }
  );

  addDimension(
    group,
    new THREE.Vector3(xMin + insetX, yMin, zGuide),
    new THREE.Vector3(xMin + insetX, yMax, zGuide),
    `${innerWidth.toFixed(1)} mm`,
    labelScale,
    { showArrows: false }
  );

  addDimension(
    group,
    new THREE.Vector3(xMax - insetX, yMax - insetY, zBottom),
    new THREE.Vector3(xMax - insetX, yMax - insetY, zTop),
    `${innerHeight.toFixed(1)} mm`,
    labelScale,
    { showArrows: false }
  );

  const fit = deriveFit(params);
  if (fit.postCenters && fit.postCenters.length === 4) {
    const postX = Math.max(...fit.postCenters.map((c) => Math.abs(c.x)));
    const postY = Math.max(...fit.postCenters.map((c) => Math.abs(c.y)));
    const xLeftCenter = -postX;
    const xRightCenter = postX;
    const yBottomCenter = -postY;
    const yTopCenter = postY;
    const postSpanX = Math.max(0, xRightCenter - xLeftCenter);
    const postSpanY = Math.max(0, yTopCenter - yBottomCenter);
    const postZ = clamp(zBottom + innerHeight * 0.12, zBottom + 0.7, zBottom + 3.2);
    const postLabelScale = clamp(labelScale * 0.86, 1.2, 3.8);
    const sideOffset = clamp(params.postDiameter * 0.62, 1.2, 3.4);
    const postXGuideY = clamp(-postY - sideOffset, yMin + 1.0, yMax - 0.8);
    const postYGuideX = clamp(-postX - sideOffset, xMin + 1.0, xMax - 0.8);
    const postColor = 0x00b894;

    if (postSpanX > 0.01) {
      addGuideLine(
        group,
        new THREE.Vector3(xLeftCenter, -postY, postZ),
        new THREE.Vector3(xLeftCenter, postXGuideY, postZ),
        postColor
      );
      addGuideLine(
        group,
        new THREE.Vector3(xRightCenter, -postY, postZ),
        new THREE.Vector3(xRightCenter, postXGuideY, postZ),
        postColor
      );

      addDimension(
        group,
        new THREE.Vector3(xLeftCenter, postXGuideY, postZ),
        new THREE.Vector3(xRightCenter, postXGuideY, postZ),
        `${postSpanX.toFixed(1)} mm`,
        postLabelScale,
        {
          color: postColor,
          labelColor: "#0f4f44",
          labelLerp: 0.5,
          labelOffset: new THREE.Vector3(0, -0.9, 0.6),
          showArrows: false
        }
      );
    }

    if (postSpanY > 0.01) {
      addGuideLine(
        group,
        new THREE.Vector3(-postX, yBottomCenter, postZ + 0.9),
        new THREE.Vector3(postYGuideX, yBottomCenter, postZ + 0.9),
        postColor
      );
      addGuideLine(
        group,
        new THREE.Vector3(-postX, yTopCenter, postZ + 0.9),
        new THREE.Vector3(postYGuideX, yTopCenter, postZ + 0.9),
        postColor
      );

      addDimension(
        group,
        new THREE.Vector3(postYGuideX, yBottomCenter, postZ + 0.9),
        new THREE.Vector3(postYGuideX, yTopCenter, postZ + 0.9),
        `${postSpanY.toFixed(1)} mm`,
        postLabelScale,
        {
          color: postColor,
          labelColor: "#0f4f44",
          labelLerp: 0.5,
          labelOffset: new THREE.Vector3(-1.0, 0, 0.6),
          showArrows: false
        }
      );
    }
  }

  return group;
}

export function createViewer(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eaf1f6");

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);
  camera.up.set(0, 0, 1);
  camera.position.set(150, -120, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x95a5b0, 0.95);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(140, 220, 120);
  scene.add(dir);

  const grid = new THREE.GridHelper(280, 14, 0x8ea4b4, 0xcbd9e3);
  grid.position.y = 0;
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  let bodyMesh = null;
  let lidMesh = null;
  let dimensionOverlay = null;
  let hasFramedModel = false;

  function clearMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function clearDimensionOverlay() {
    if (!dimensionOverlay) return;
    scene.remove(dimensionOverlay);
    disposeObject3D(dimensionOverlay);
    dimensionOverlay = null;
  }

  function update({ body, previewBody, previewLid, params }) {
    clearMesh(bodyMesh);
    clearMesh(lidMesh);
    clearDimensionOverlay();

    const bodyGeom = geom3ToBufferGeometry(previewBody || body);
    const lidGeom = geom3ToBufferGeometry(previewLid);

    bodyMesh = new THREE.Mesh(
      bodyGeom,
      new THREE.MeshStandardMaterial({
        color: "#4f7f99",
        metalness: 0.05,
        roughness: 0.68,
        transparent: true,
        opacity: 0.84
      })
    );

    lidMesh = new THREE.Mesh(
      lidGeom,
      new THREE.MeshStandardMaterial({
        color: "#91a8b8",
        metalness: 0.05,
        roughness: 0.72,
        transparent: true,
        opacity: 0.6
      })
    );

    scene.add(bodyMesh);
    scene.add(lidMesh);
    dimensionOverlay = makeDimensionOverlay(params);
    if (dimensionOverlay) {
      dimensionOverlay.position.z = params.height / 2;
      scene.add(dimensionOverlay);
    }

    const box = new THREE.Box3().setFromObject(bodyMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 20);

    camera.near = 0.1;
    camera.far = maxDim * 30;

    if (!hasFramedModel) {
      camera.position.set(maxDim * 1.75, -maxDim * 1.25, maxDim * 0.95);
      controls.target.set(0, 0, 0);
      controls.update();
      hasFramedModel = true;
    }

    camera.updateProjectionMatrix();

    return {
      bodyTriangles: bodyGeom.getAttribute("position").count / 3,
      lidTriangles: lidGeom.getAttribute("position").count / 3
    };
  }

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", onResize);

  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  return { update };
}
