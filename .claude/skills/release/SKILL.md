---
name: release
description: Cut a tag-based release of the action - link the pre-v3 tag history once, verify dist/, tag vX.Y.Z, move the major tag, alias the release branch. Never pushes or publishes a GitHub release without explicit confirmation for that specific action.
disable-model-invocation: true
---

Release version `$ARGUMENTS` (a semver like `3.0.0`, no `v` prefix). If no argument was given, stop and ask for the version.

## Preconditions

1. Working tree clean and current branch `master`: `git status --short` must be empty. If it isn't, stop and show it.
2. CI is green on the `master` commit being released (`gh run list --branch master --limit 1` or the GitHub UI). Stop if it isn't.

## One-time: link the pre-v3 tag history

No tag from the `v1.x`/`v2.x` line is an ancestor of `master` - the release-branch history and the tag history diverged before this repo moved to tag-based releases. Left alone, `semantic-release` would read `master` as having no prior release and cut `1.0.0`. This step fixes that, once, before the first `v3` tag exists.

1. Check whether it's already done: `git merge-base --is-ancestor v2.1.1 HEAD`. Exit code `0` means the link exists - skip to "Release".
2. On `master`: `git merge -s ours --allow-unrelated-histories v2.1.1 -m "chore: link release history"`.
3. Verify the merge touched no files: `git diff HEAD~1 --stat` must be empty. A non-empty diff means it picked up more than history linkage - stop and investigate before continuing. Because the merge changes no files, the commit it creates carries forward the exact tree CI already validated on the pre-merge `master` commit - the "CI is green" precondition above still holds for the commit that actually gets tagged, even though CI hasn't literally run on this new merge commit.
4. Push `master` with this merge commit: `git push origin master`. Needs the owner's confirmation, like any push.

## Release

1. Run `npm run all` (clean, build, format, lint, package, test) with `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` set in the env. Stop on any failure and show the output; without those three set, the live-API tests in `src/main.test.ts` skip themselves, so say so and stop rather than releasing untested.
2. Confirm the `dist/` that `npm run all` just rebuilt matches what's committed: `git diff --exit-code dist/`. This is the same check CI's `dist-check` job runs, so a clean diff here means that job will pass too. A non-empty diff is unexpected at this point - stop and investigate rather than committing a release-time rebuild.
3. Tag: `git tag -a v$ARGUMENTS -m "v$ARGUMENTS"`.
4. Move the floating major tag to the same commit, e.g. `git tag -f v3`.
5. Push the tags. Each of these needs the owner's explicit confirmation for that specific push - approving one is not approval of the next:
   - `git push origin v$ARGUMENTS`
   - `git push -f origin v3` (or whichever major tag moved)

## Alias the `release` branch

`release` is a deprecated but still-documented way to track the latest tag (`@release` in the README). Today it has unrelated history from `master` - its own old force-push lineage - so a plain push is rejected.

1. Check which case applies, rather than relying on memory: `git fetch origin release` then `git merge-base --is-ancestor origin/release HEAD`.
2. Exit code `1` (not an ancestor - the first time `release` is aliased onto the new tag history, or its history has diverged again): `git push -f origin master:release`. Needs the owner's explicit confirmation for this specific push - it force-overwrites the branch.
3. Exit code `0` (`release` is already an ancestor of `master`, the normal case after the first alias): `git push origin master:release`. Still needs the owner's explicit confirmation for this specific push - a fast-forward is still a push to a public branch, not something to run on autopilot.

## Verify

Verify by reading the remote independently, not by trusting what the push commands printed:

- `git ls-remote --tags origin v$ARGUMENTS v3` (substitute whichever major tag). `vX.Y.Z` is annotated, so it prints two lines: `refs/tags/vX.Y.Z` is the tag *object's own* SHA - not what you want - and `refs/tags/vX.Y.Z^{}` is the dereferenced commit it points to - that's the one to compare. `vN` is lightweight, so its single line is already a commit SHA. The `vX.Y.Z^{}` line and the `vN` line must match; comparing the plain `vX.Y.Z` line against `vN` will look broken even on a correct release.
- `git ls-remote --heads origin release` - `release` must point at that same commit (the one on the `vX.Y.Z^{}` and `vN` lines above).

Once verified, create the GitHub release. This is a public, irreversible remote action like a push and needs the same explicit confirmation from the owner for this specific release: `gh release create v$ARGUMENTS --generate-notes`.

## Rollback

If a pushed release needs to be undone:

- Major tag: `git tag -f v3 <last-good-sha>` then `git push -f origin v3` (owner confirmation required).
- `release` branch: `git push -f origin <last-good-sha>:release` (owner confirmation required).

Leave the `vX.Y.Z` tag itself in place - semver tags are permanent records, not pointers to move. Cut a new patch tag for the fix instead.
