#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VERSION_FILE = path.join(ROOT, ".cache-version");
const TARGET_FILES = [
  "index.html",
  "src/main.js",
  "src/model/box.js",
  "src/model/features.js",
  "src/validators.js"
];

function readVersion() {
  if (!fs.existsSync(VERSION_FILE)) return 0;
  const raw = fs.readFileSync(VERSION_FILE, "utf8").trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function writeVersion(version) {
  fs.writeFileSync(VERSION_FILE, `${version}\n`, "utf8");
}

function bumpVersion() {
  const setIndex = process.argv.indexOf("--set");
  if (setIndex !== -1 && process.argv[setIndex + 1]) {
    const n = Number.parseInt(process.argv[setIndex + 1], 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Invalid --set value. Expected a positive integer.");
    }
    return n;
  }
  return readVersion() + 1;
}

function applyIndexHtml(content, version) {
  let next = content;
  next = next.replace(
    /(<link rel="icon" href="\.\/favicon\.svg\?v=)\d+(" type="image\/svg\+xml" \/>)/,
    `$1${version}$2`
  );
  next = next.replace(
    /(<link rel="stylesheet" href="\.\/styles\.css\?v=)\d+(" \/>)/,
    `$1${version}$2`
  );
  next = next.replace(
    /(<script type="module" src="\.\/src\/main\.js\?v=)\d+("><\/script>)/,
    `$1${version}$2`
  );
  return next;
}

function applyJs(content, version) {
  return content.replace(
    /(from\s+["'](?:\.\.\/|\.\/)[^"']+?\.js)(?:\?v=\d+)?(["'])/g,
    `$1?v=${version}$2`
  );
}

function updateFile(file, version) {
  const abs = path.join(ROOT, file);
  const current = fs.readFileSync(abs, "utf8");
  const next = file === "index.html"
    ? applyIndexHtml(current, version)
    : applyJs(current, version);
  if (next !== current) {
    fs.writeFileSync(abs, next, "utf8");
    return true;
  }
  return false;
}

function main() {
  const version = bumpVersion();
  const changed = [];
  for (const file of TARGET_FILES) {
    if (updateFile(file, version)) changed.push(file);
  }
  writeVersion(version);
  console.log(`Cache version set to v${version}`);
  if (changed.length) {
    console.log(`Updated ${changed.length} files:`);
    for (const file of changed) console.log(`- ${file}`);
  } else {
    console.log("No file content changes were needed.");
  }
}

main();
