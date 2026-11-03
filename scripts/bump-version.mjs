#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.resolve(import.meta.dirname, "../package.json");
const SEMVER_REGEX = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/u;
const BREAKING_REGEX = /BREAKING CHANGE|^[a-z]+(?:\([^)]+\))?!:/imu;
const FEAT_REGEX = /^feat(?:\([^)]+\))?:/imu;

function parseSemver(version) {
  const match = String(version).trim().match(SEMVER_REGEX);
  if (!match?.groups) {
    return [0, 0, 0];
  }
  return [
    Number(match.groups.major),
    Number(match.groups.minor),
    Number(match.groups.patch),
  ];
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

function bumpVersion(version, bumpType = "patch") {
  const [major, minor, patch] = parseSemver(version);
  if (bumpType === "major") {
    return `${major + 1}.0.0`;
  }
  if (bumpType === "minor") {
    return `${major}.${minor + 1}.0`;
  }
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

function detectLevelFromText(text) {
  if (!text) {
    return null;
  }
  if (BREAKING_REGEX.test(text)) {
    return "major";
  }
  if (FEAT_REGEX.test(text)) {
    return "minor";
  }
  return "patch";
}

function detectLevelFromGitCommits() {
  try {
    const log = execSync("git log origin/main..HEAD --format=%B", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return detectLevelFromText(log);
  } catch {
    return null;
  }
}

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const onlyIfNotBumped = args.has("--if-needed");

let explicitLevel = null;
for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === "major" || arg === "minor" || arg === "patch") {
    explicitLevel = arg;
  } else if (arg === "--msg-file" && rawArgs[i + 1]) {
    try {
      const msg = fs.readFileSync(rawArgs[i + 1], "utf8");
      explicitLevel = detectLevelFromText(msg) ?? explicitLevel;
    } catch {
      // ignore unreadable message file
    }
  }
}

const level = explicitLevel ?? detectLevelFromGitCommits() ?? "patch";

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version ?? "1.0.0";
const remoteVersion = getRemoteMainVersion();

const baseVersion = remoteVersion === null ? currentVersion : remoteVersion;
const requiredMinimumVersion = bumpVersion(baseVersion, level);

if (
  onlyIfNotBumped &&
  remoteVersion !== null &&
  compareSemver(currentVersion, requiredMinimumVersion) >= 0
) {
  process.exit(0);
}

const nextVersion =
  explicitLevel && !onlyIfNotBumped && remoteVersion !== null
    ? bumpVersion(
        compareSemver(remoteVersion, currentVersion) >= 0
          ? remoteVersion
          : baseVersion,
        explicitLevel
      )
    : requiredMinimumVersion;

pkg.version = nextVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
process.stdout.write(`${nextVersion}\n`);
