import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const requiredPackageFields = [
  "name",
  "displayName",
  "description",
  "version",
  "publisher",
  "license",
  "icon",
  "categories",
  "keywords",
  "engines",
  "main",
  "contributes",
];
const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "SUPPORT.md",
  ".vscodeignore",
  "package-lock.json",
  ".github/workflows/ci.yml",
  ".github/workflows/publish.yml",
];
const forbiddenVsixEntries = [
  "extension/thesis.md",
  "extension/ideel_thesis.md",
  "extension/.gitignore",
  "extension/package-lock.json",
  "extension/PROJECT_LOG.md",
  "extension/AGENTS.md",
  "extension/DESIGN_PRINCIPLES.md",
];

for (const field of requiredPackageFields) {
  const value = packageJson[field];
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`package.json is missing required Marketplace field: ${field}`);
  }
}

if (!packageJson.scripts?.deploy || !packageJson.scripts.deploy.includes("vsce publish")) {
  throw new Error("package.json needs a deploy script that publishes with vsce.");
}

const tagName = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : "";
if (tagName && tagName !== `v${packageJson.version}`) {
  throw new Error(`Release tag ${tagName} does not match package.json version ${packageJson.version}.`);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Release file is missing: ${file}`);
  }
}

run("npm", ["test"]);
run("npm", ["run", "package:vsix"]);

const expectedVsix = path.join(root, `${packageJson.name}-${packageJson.version}.vsix`);
if (!fs.existsSync(expectedVsix)) {
  throw new Error(`Expected package was not created: ${path.basename(expectedVsix)}`);
}

const entries = execFileSync("unzip", ["-Z1", expectedVsix], {
  cwd: root,
  encoding: "utf8",
}).trim().split("\n");
const entrySet = new Set(entries);

for (const entry of forbiddenVsixEntries) {
  if (entrySet.has(entry)) {
    throw new Error(`VSIX includes a file that should stay out of Marketplace packages: ${entry}`);
  }
}

const requiredVsixEntries = [
  "extension/package.json",
  "extension/readme.md",
  "extension/changelog.md",
  "extension/LICENSE.txt",
  "extension/SUPPORT.md",
  `extension/${packageJson.main.replace(/^\.\//, "")}`,
  `extension/${packageJson.icon}`,
];

for (const entry of requiredVsixEntries) {
  if (!entrySet.has(entry)) {
    throw new Error(`VSIX is missing required entry: ${entry}`);
  }
}

console.log(`Release check passed for ${packageJson.publisher}.${packageJson.name}@${packageJson.version}.`);

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });
}
