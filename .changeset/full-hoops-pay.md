---
'changesets-snapshot': minor
---

Rewrite `workspace:^` and `workspace:~` to `workspace:*` after snapshot versioning when the referenced package was bumped.

`pnpm pack` otherwise publishes a caret/tilde range on the snapshot prerelease, which can resolve to a stable release or a different snapshot instead of the version just published.
