---
name: release
description: Release the action. CI does it on a green push to master; this covers the one-time history link that has to happen first, the dry run that gates the first automated release, re-running the aliases on their own, the manual tagging fallback, and rollback. Never pushes or publishes without explicit confirmation for that specific action.
disable-model-invocation: true
---

Release version `$ARGUMENTS` (a semver like `3.0.0`, no `v` prefix). If no argument was given, stop and ask for the version.

## How releasing works now

`.github/workflows/ci.yml` has a `release` job. On a push to `master` where `test`, `dist-check` and `e2e` are all green it runs `semantic-release`, which reads the commit messages, decides the version, tags it and creates the GitHub release. A second step then moves the floating major tag (`v3`) and the deprecated `release` branch onto that commit.

So the normal release is: merge to `master`, watch CI, verify from the remote. Nothing below is needed for it. The rest of this file is the once-only setup, the recovery paths and the manual fallback.

## Once, before the first automated release

Both of these have to be done by hand, in this order, and each push needs the owner's explicit confirmation for that specific push.

### 1. Link the pre-v3 tag history

No tag from the `v1.x`/`v2.x` line is an ancestor of `master` - the release-branch history and the tag history diverged before this repo moved to tag-based releases. Left alone, `semantic-release` reads `master` as a repository that has never released and cuts `1.0.0`, publishing a `v1` tag over the v1 line.

1. Check whether it's already done: `git merge-base --is-ancestor v2.1.1 HEAD`. Exit code `0` means the link exists - skip ahead.
2. On `master`: `git merge -s ours --allow-unrelated-histories v2.1.1 -m "chore: link release history"`.
3. Verify the merge touched no files: `git diff HEAD~1 --stat` must be empty. A non-empty diff means it picked up more than history linkage - stop and investigate. Because the merge changes no files, the commit it creates carries forward the exact tree CI already validated on the pre-merge `master` commit.
4. `git push origin master`.

### 2. Point the `release` branch at the new history

`release` is a deprecated but still-documented way to track the latest tag (`@release` in the README). Today it has unrelated history from `master` - its own old force-push lineage - so the plain push the workflow's alias step makes is rejected. One force-push fixes that for good; every later release fast-forwards.

1. `git fetch origin release` then `git merge-base --is-ancestor origin/release HEAD`.
2. Exit code `1` (not an ancestor): `git push -f origin master:release`. It force-overwrites a public branch, so confirm this specific push.
3. Exit code `0`: nothing to do, the workflow handles it from here.

### 3. Cut `v3.0.0` by hand, then prove semantic-release agrees

`semantic-release` cannot be trusted to pick the version until a `v3` tag is reachable from `master`. Cut the first one manually with the fallback below, then, on a fresh checkout of `master` with a `GITHUB_TOKEN` in the env:

```sh
git fetch --tags
npx semantic-release --dry-run --no-ci
```

It must say it would publish a `3.x` version. If it says `1.0.0`, step 1 did not take - stop, because a real run would tag `v1` over the v1 line. Only once this passes should a push to `master` be allowed to reach the `release` job. `test-docs/revive-v3.md` records this gate too.

## Re-running the aliases on their own

If `semantic-release` tagged and published but the alias step failed - a diverged `release` branch, an expired token, a cancelled run - do not release again. Run the CI workflow with `workflow_dispatch` and give it the version that was released (e.g. `3.0.2`). That path skips `test`, `dist-check`, `e2e` and `semantic-release` and runs the alias movement alone. Running it against a version whose aliases are already correct is a clean no-op.

If the alias step failed because `release` has diverged, the plain push will keep failing until someone decides what happened to that branch. Redo step 2 above once the divergence is understood.

## Manual fallback: tag by hand

Use this when the workflow itself is broken, or for the first `v3.0.0` before the automation is trusted.

1. Preconditions: `git status --short` empty, current branch `master`, CI green on the commit being released (`gh run list --branch master --limit 1`).
2. Run `npm run all` (clean, build, format, lint, package, test) with `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` set. Stop on any failure and show the output; without those three set the live-API tests in `src/main.test.ts` skip themselves, so say so and stop rather than releasing untested.
3. `git diff --exit-code dist/` must be clean after that rebuild. Same check as CI's `dist-check`. A non-empty diff here is unexpected - investigate rather than committing a release-time rebuild.
4. Tag: `git tag -a v$ARGUMENTS -m "v$ARGUMENTS"`.
5. Move the floating major tag onto the same commit: `git tag -f v3 "v$ARGUMENTS^{}"`. The `^{}` matters - without it `v3` ends up pointing at the annotated tag object rather than the commit.
6. Push, each with its own confirmation - approving one is not approval of the next:
   - `git push origin v$ARGUMENTS`
   - `git push -f origin v3`
   - `git push origin "v$ARGUMENTS^{}:refs/heads/release"` (the first time, see step 2 of the setup above, this has to be `git push -f origin master:release` instead)
7. `gh release create v$ARGUMENTS --generate-notes`. Public and irreversible, so confirm this specific release.

## Verify

Verify by reading the remote, not by trusting what the push commands or the CI log printed:

- `git ls-remote --tags origin v$ARGUMENTS v3`
- `git ls-remote --heads origin release`

How many lines `v$ARGUMENTS` prints depends on who made it. `semantic-release` creates a lightweight tag, so an automated release prints one line and that line is already the commit. The manual fallback's `git tag -a` creates an annotated tag, which prints two: `refs/tags/vX.Y.Z` is the tag object - not what you want - and `refs/tags/vX.Y.Z^{}` is the commit. Compare against the `^{}` line whenever there is one. `v3` is always lightweight, so its single line is the commit. That commit and the `release` head must be the same.

## Rollback

- Major tag: `git tag -f v3 <last-good-sha>` then `git push -f origin v3` (owner confirmation required).
- `release` branch: `git push -f origin <last-good-sha>:release` (owner confirmation required).

Leave the `vX.Y.Z` tag itself in place - semver tags are permanent records, not pointers to move. Cut a new patch tag for the fix instead. Deleting the GitHub release is `gh release delete v$ARGUMENTS`, which is again a public action needing confirmation.
