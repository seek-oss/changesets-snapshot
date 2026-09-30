//#region node_modules/.pnpm/@changesets+cli@3.0.3/node_modules/@changesets/cli/package.json
var package_default = {
	name: "@changesets/cli",
	version: "3.0.3",
	description: "A tool to manage versioning and changelogs with a focus on monorepos",
	homepage: "https://changesets.dev",
	license: "MIT",
	author: "Changesets Contributors",
	contributors: [
		"Ben Conolly",
		"Mitchell Hamilton",
		"Mateusz Burzyński <mateuszburzynski@gmail.com> (https://github.com/Andarist)"
	],
	repository: {
		"type": "git",
		"url": "git+https://github.com/changesets/changesets.git",
		"directory": "packages/cli"
	},
	bin: { "changeset": "bin.js" },
	files: [
		"default-files",
		"dist",
		"bin.js"
	],
	type: "module",
	exports: {
		".": "./dist/index.mjs",
		"./changelog": "./dist/changelog.mjs",
		"./commit": "./dist/commit/index.mjs",
		"./package.json": "./package.json",
		"./bin.js": "./bin.js"
	},
	dependencies: {
		"@clack/prompts": "^1.7.0",
		"@manypkg/get-packages": "^3.1.0",
		"@pnpm/deps.graph-sequencer": "^1100.0.1",
		"cac": "^7.0.0",
		"import-meta-resolve": "^4.2.0",
		"launch-editor": "^2.14.1",
		"package-manager-detector": "^1.6.0",
		"semver": "^7.8.1",
		"tinyexec": "^1.3.1",
		"@changesets/apply-release-plan": "^8.1.1",
		"@changesets/assemble-release-plan": "^7.0.0",
		"@changesets/changelog-git": "^1.0.0",
		"@changesets/config": "^4.0.1",
		"@changesets/errors": "^1.0.0",
		"@changesets/get-dependents-graph": "^3.0.0",
		"@changesets/git": "^4.0.1",
		"@changesets/pre": "^3.0.0",
		"@changesets/read": "^1.0.1",
		"@changesets/should-skip-package": "^1.0.0",
		"@changesets/types": "^7.0.0",
		"@changesets/write": "^1.0.1"
	},
	devDependencies: {
		"@types/semver": "^7.8.0",
		"human-id": "^4.2.1",
		"outdent": "^0.8.0",
		"@changesets/color": "^1.0.0",
		"@changesets/test-utils": "0.0.9-next.3"
	},
	engines: {
		"node": "^22.11 || ^24 || >=26",
		"npm": ">=10.9.0",
		"pnpm": ">=10.0.0",
		"yarn": ">=4.5.2"
	}
};
//#endregion
export { package_default as default };
