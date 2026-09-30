---
'changesets-snapshot': major
---

Require `@changesets/cli` v3

This change requires that the consuming project be updated to `@changesets/cli@^3`. This can be done by running the following command at the top-level of the project:

```sh
pnpm add --save-dev --workspace-root @changesets/cli@3
```

A consequence of this change is that a snapshot with no changesets now fails the job, aligning behaviour between this action and the Changesets CLI.

For more details about this upgrade and what else might be required for your project please refer to the [Changesets V3 announcement](https://changesets.dev/blog/announcing-changesets-v3).
