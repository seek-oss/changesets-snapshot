# changesets-snapshot

A GitHub Action for publishing [snapshot releases] when using [changesets].

[snapshot releases]: https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md
[changesets]: https://github.com/changesets/changesets

## Why

Changesets publish a [GitHub action] which can be used for the regular changesets flow of Version Packages PR and publishing to NPM.

Unfortunately, this action doesn't support publishing snapshot releases (yet?).

This action _only_ provides snapshot publishing of NPM packages to the npm registry.

[github action]: https://github.com/changesets/action

## Getting Started

To publish snapshot releases for your package, you need to create a workflow that uses the `seek-oss/changesets-snapshot` action.

You probably also want to run this workflow manually, rather than on every push, which means configuring it to respond to the [`workflow_dispatch` event][wde].

You will need to provide an NPM token and a GitHub token to the `env` of the action.

An example workflow might look like:

```yaml
name: Snapshot

on: workflow_dispatch

jobs:
  release:
    name: Publish snapshot version
    runs-on: ubuntu-latest
    env:
      CI: true
    steps:
      - name: Check out repo
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Node.js 16.x
        uses: actions/setup-node@v3
        with:
          node-version: 16.x

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Publish
        uses: seek-oss/changesets-snapshot@v0
        with:
          pre-publish: yarn build
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

[wde]: https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow

## API

### Inputs

When running the regular changesets action, you can [provide your own scripts][scripts] for `version` and `publish`, which allows you to use custom publishing behaviours instead of the changesets builtin.

This is useful if you are:

- not publishing to the npmjs.com registry or releasing an NPM packge, hence requiring some other publish process
- or, if there are other processes you need to run in conjunction with versioning/publishing.

This action only publishes NPM packages to the npmjs.com registry, but the second point is addressed through the `pre-` inputs.

#### `pre-version`

You can provide a script here that will run before the `changeset version` command, in case you have any custom versioning requirements that wouldn't be handled by the inbuilt changeset version command.

#### `pre-publish`

Perhaps more common, the `pre-publish` input can be used for processes you want to run before (and only before) the npm publish occurs.

For example, you might want to use this step to run a build before the publish step runs.

[scripts]: https://github.com/changesets/action#inputs

### Outputs

The action reports on the outcome of publishing primarily with a notice in the [step summary], but also as action outputs.

The action outputs are listed in the [action.yml] file.

[step summary]: https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/
[action.yml]: ./action.yml
