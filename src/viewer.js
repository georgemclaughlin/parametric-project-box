import * as THREE from "https://esm.sh/three@0.179.1";
import { OrbitControls } from "https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js";
import { geometries } from "https://esm.sh/@jscad/modeling@2.12.6";

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
  let hasFramedModel = false;

  function clearMesh(mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  function update({ body, previewBody, previewLid }) {
    clearMesh(bodyMesh);
    clearMesh(lidMesh);

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
