"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  publishSnapshot: () => publishSnapshot
});
module.exports = __toCommonJS(src_exports);
var core2 = __toESM(require("@actions/core"));
var github = __toESM(require("@actions/github"));
var import_ni = require("@antfu/ni");

// src/logger.ts
var logger = {
  error: console.error,
  log: console.log,
  warn: console.warn
};

// src/npm-utils.ts
var import_fs = __toESM(require("fs"));
var ensureNpmrc = (npmToken) => {
  const userNpmrcPath = "./.npmrc";
  if (import_fs.default.existsSync(userNpmrcPath)) {
    logger.log("Found existing user .npmrc file. Overwriting.");
  } else {
    logger.log("No user .npmrc file found, creating one");
  }
  import_fs.default.writeFileSync(userNpmrcPath, `//registry.npmjs.org/:_authToken=${npmToken}
`);
  logger.log(`.npmrc file written to ${userNpmrcPath}
`);
};

// src/run.ts
var core = __toESM(require("@actions/core"));
var import_get_packages = require("@manypkg/get-packages");

// src/utils.ts
var import_exec = require("@actions/exec");
var execWithOutput = async (command, args, options) => {
  let myOutput = "";
  let myError = "";
  return {
    code: await (0, import_exec.exec)(command, args, {
      listeners: {
        stdout: (data) => {
          myOutput += data.toString();
        },
        stderr: (data) => {
          myError += data.toString();
        }
      },
      ...options
    }),
    stdout: myOutput,
    stderr: myError
  };
};

// src/run.ts
var run = async ({ script, cwd = process.cwd() }) => {
  const [runCommand, ...runArgs] = script.split(/\s+/);
  return execWithOutput(runCommand, runArgs, { cwd });
};
var runPublish = async ({
  script,
  cwd = process.cwd()
}) => {
  const prepublishScript = core.getInput("pre-publish");
  if (prepublishScript) {
    await execWithOutput(prepublishScript);
  }
  const changesetPublishOutput = await run({ script, cwd });
  const { packages, tool } = await (0, import_get_packages.getPackages)(cwd);
  const releasedPackages = [];
  if (tool !== "root") {
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(packages.map((x) => [x.packageJson.name, x]));
    for (const line of changesetPublishOutput.stdout.split("\n")) {
      const match = line.match(newTagRegex);
      if (match === null) {
        continue;
      }
      const pkgName = match[1];
      const pkg = packagesByName.get(pkgName);
      if (pkg === void 0) {
        throw new Error(`Package "${pkgName}" not found.This is probably a bug in the action, please open an issue`);
      }
      releasedPackages.push(pkg);
    }
  } else {
    if (packages.length === 0) {
      throw new Error("No package found.This is probably a bug in the action, please open an issue");
    }
    const pkg = packages[0];
    const newTagRegex = /New tag:/;
    for (const line of changesetPublishOutput.stdout.split("\n")) {
      const match = line.match(newTagRegex);
      if (match) {
        releasedPackages.push(pkg);
        break;
      }
    }
  }
  if (releasedPackages.length) {
    return {
      published: true,
      publishedPackages: releasedPackages.map((pkg) => ({
        name: pkg.packageJson.name,
        version: pkg.packageJson.version
      }))
    };
  }
  return { published: false };
};

// src/index.ts
function annotate({
  title,
  message,
  codeBlock
}) {
  core2.summary.addHeading(title, 3);
  core2.summary.addRaw(message);
  if (codeBlock) {
    core2.summary.addCodeBlock(codeBlock);
  }
}
var publishSnapshot = async () => {
  core2.setOutput("published", false);
  core2.setOutput("publishedPackages", []);
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    core2.setFailed("Unable to retrieve GitHub token");
    return;
  }
  const npmToken = process.env.NPM_TOKEN;
  if (!npmToken) {
    core2.setFailed("Unable to retrieve NPM publish token");
    throw new Error();
  }
  ensureNpmrc(npmToken);
  const branch = github.context.ref.replace("refs/heads/", "");
  const cleansedBranchName = branch.replace(/\//g, "_");
  const preVersionScript = core2.getInput("pre-version");
  if (preVersionScript) {
    await execWithOutput(preVersionScript);
  }
  const packageManager = await (0, import_ni.detect)({ cwd: process.cwd() });
  if (!packageManager) {
    core2.setFailed("Unable to detect package manager");
    throw new Error();
  }
  const versionResult = await run({
    script: `changeset version --snapshot ${cleansedBranchName}`
  });
  if (versionResult.stderr.indexOf("No unreleased changesets found") > 0) {
    logger.log("\nNo changesets found. In order to publish a snapshot version, you must have at least one changeset committed.\n");
    annotate({
      title: "\u26A0\uFE0F No snapshot published",
      message: "No changesets found, skipping publish. If you want to publish a snapshot version, you may need to add a changeset for the relevant package."
    });
    return;
  }
  const result = await runPublish({
    script: `changeset publish --tag ${cleansedBranchName}`
  });
  core2.setOutput("published", result.published);
  if (result.published) {
    core2.setOutput("publishedPackages", result.publishedPackages);
    const pkgNoun = result.publishedPackages.length === 1 ? "snapshot" : "snapshots";
    for (const { name, version } of result.publishedPackages) {
      annotate({
        title: `\u{1F98B} New ${pkgNoun} published!`,
        message: `Version: \`${name}@${version}\``,
        codeBlock: (0, import_ni.getCommand)(packageManager, "add", [
          `${name}@${cleansedBranchName}`
        ])
      });
    }
    const newVersionsList = result.publishedPackages.map(({ name, version }) => `- ${name}@${version}`).join("\n");
    logger.log(`
${result.publishedPackages.length} ${pkgNoun} published.
${newVersionsList}
`.trim());
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  publishSnapshot
});
