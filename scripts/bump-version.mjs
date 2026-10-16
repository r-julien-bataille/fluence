#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.resolve(import.meta.dirname, "../package.json");
const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)/u;

function parseSemver(version) {
  const match = String(version).trim().match(SEMVER_REGEX);
  if (!match) {
    return [0, 0, 0];
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

function bumpPatch(version) {
  const [major, minor, patch] = parseSemver(version);
  return `${major}.${minor}.${patch + 1}`;
}

function getRemoteMainVersion() {
  try {
    const raw = execSync("git show origin/main:package.json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw).version ?? "0.0.0";
  } catch {
    return null;
  }
}

const args = new Set(process.argv.slice(2));
const onlyIfNotBumped = args.has("--if-needed");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version ?? "1.0.0";
const remoteVersion = getRemoteMainVersion();

if (
  onlyIfNotBumped &&
  remoteVersion !== null &&
  compareSemver(currentVersion, remoteVersion) > 0
) {
  process.exit(0);
}

const baseVersion =
  remoteVersion !== null && compareSemver(remoteVersion, currentVersion) > 0
    ? remoteVersion
    : currentVersion;

const nextVersion = bumpPatch(baseVersion);
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
process.stdout.write(`${nextVersion}\n`);
