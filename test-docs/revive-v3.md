# Deferred verification for the v3 revival

Checks that could not be run while the work was done, with the exact command and the
exact thing to look for. Each one is a gate: do not take the next step until it passes.

## semantic-release must be shown to cut the right version before it is trusted

`.releaserc` now points `semantic-release` at `master` instead of the old `release`
branch, so the version it cuts is decided by the tags reachable from `master`.

Today no tag is reachable from `master` at all - not `v2.1.1`, not anything older
(`git tag --merged master` prints nothing). The release-branch history and the tag
history diverged years ago. Until the one-time
`git merge -s ours --allow-unrelated-histories v2.1.1` from the `/release` skill is on
`master` and `v3.0.0` is tagged, `semantic-release` reads `master` as a repository that
has never released and will cut `1.0.0`, publishing a `v1` tag over the v1 line.

So the first automated release is gated. After the manual `v3.0.0` release has been cut
and pushed, and before any push to `master` is allowed to run a real release:

```sh
git fetch --tags
npx semantic-release --dry-run --no-ci
```

Read the line that says which version it would publish. It must be a `3.x` version -
`3.0.1` or `3.1.0` depending on the commits since the tag - and it must never be
`1.0.0`. `1.0.0` means the history link is missing or the tag is not an ancestor of the
commit being released; stop and fix that before letting a real run happen.

The dry run needs a `GITHUB_TOKEN` (or `GH_TOKEN`) in the environment with read access
to the repository.
