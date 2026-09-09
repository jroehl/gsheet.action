---
name: release
description: Release the action. CI does it on a green push to master; this covers the one-time setup sequence that has to happen first and the order it has to happen in, the dry run that gates the first automated release, re-running the aliases on their own, the manual tagging fallback, and rollback. Never pushes or publishes without explicit confirmation for that specific action.
disable-model-invocation: true
---

Release version `$ARGUMENTS` (a semver like `3.0.0`, no `v` prefix). If no argument was given, stop and ask for the version.

## How releasing works now

`.github/workflows/ci.yml` has a `release` job. On a push to `master` where `test`, `dist-check` and `e2e` are all green it runs `semantic-release`, which reads the commit messages, decides the version, tags it and creates the GitHub release. A second step then moves the floating major tag (`v3`) and the deprecated `release` branch onto that commit.

So the normal release is: merge to `master`, watch CI, verify from the remote. Nothing below is needed for it, once the one-time setup has been done. The rest of this file is that setup, the recovery paths and the manual fallback.

## Once, before the first automated release

Nothing above works until `v3.0.0` exists on the remote, and the order below is the whole point of this section. **`git push origin master` comes last, after `v3.0.0` and `v3` are pushed.** Push master earlier and the workflow starts a release job on a `master` from which only the linked `v1`/`v2` tags are reachable; `semantic-release` then reads the v2 line as its baseline and cuts **2.2.0** - a published GitHub release and a permanent `v2.2.0` tag carrying v3 code, followed by the alias step force-moving `v2` onto the breaking v3 action. Neither can be taken back. The `release` job's guard refuses a push with no `v3.*` tag reachable, so this is belt and braces, but the guard is there to catch the mistake, not to make the order optional.

For the same reason: **PR B (the toolchain PR) must not be merged until `v3.0.0` is reachable from `master`.** Merging it is a push to `master`.

Each push below is a separate action needing the owner's explicit confirmation for that specific push. Approving one is not approval of the next.

### The sequence

1. **Squash-merge PR A** (the v3.0.0 hotfix) into `master` on GitHub, with CI green on it.
   *Stops here if* CI is not green, or if `google-sheet-cli` 2.3.0 is not yet released and PR A still needs its version bump.

   Expect `master` to go red on this merge and stay red until step 8. The merge is a push to `master`, so it reaches the `release` job, and the guard fails it because no `v3.*` tag is reachable yet. That is the guard doing its job, not a broken build: `test`, `dist-check` and `e2e` are green and only `release` fails. Do not try to fix it - step 8 is the fix.

2. **Rebase `toolchain` (PR B) onto the new `master` and re-verify the bundle.** `toolchain` carries PR A's commits as its own base, so the rebase replays content the squash already put on `master`. Measured, not guessed: it stops **once**, on the `outputFile` commit, conflicting in `README.md` and `src/main.ts`. Three commits drop as empty and 27 of the 30 replay untouched. `dist/` does not conflict - resolve the two files, finish the rebase, then rebuild rather than hand-merging any bundle. Then, on that branch: `npm ci && npm run all`, and `git diff --exit-code dist/` must be clean; commit and push the rebuilt bundle onto PR B if it is not.

   This step gates nothing. Nothing between here and step 10 depends on PR B, so a red or unfinished PR B is not a reason to pause the release - it is only a reason not to merge it at step 11. If the rebase turns out worse than the above, leave it and come back after step 10.

3. **Link the pre-v3 tag history, locally.** No tag from the `v1.x`/`v2.x` line is an ancestor of `master` - the release-branch history and the tag history diverged before this repo moved to tag-based releases. Left alone, `semantic-release` reads `master` as a repository that has never released and cuts `1.0.0`.

   - Check whether it is already done: `git merge-base --is-ancestor v2.1.1 HEAD`. Exit code `0` means the link exists - skip to step 4.
   - On `master`: `git merge -s ours --allow-unrelated-histories v2.1.1 -m "chore: link release history"`.
   - `git diff HEAD~1 --stat` must be empty. Because the merge changes no files, the commit it creates carries forward the exact tree CI already validated on the pre-merge `master` commit.

   Do **not** push `master` here. *Stops here if* the diff is not empty - the merge picked up more than history linkage; investigate before anything is tagged or pushed.

4. **Build and tag `v3.0.0` locally.** `git status --short` must be empty and the branch must be `master`. Run `npm run all` (clean, build, format, lint, package, test) with `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` set, then `git diff --exit-code dist/`. Then:

   ```sh
   git tag -a v3.0.0 -m "v3.0.0"
   git tag -f v3 "v3.0.0^{}"
   ```

   The `^{}` matters: without it `v3` points at the annotated tag object rather than the commit. *Stops here if* `npm run all` fails, if `dist/` is dirty after the rebuild, or if the three credentials are not set - without them the live-API tests in `src/main.test.ts` skip themselves, so say so and stop rather than tag something untested.

5. **`git push origin v3.0.0`** (confirmation). This publishes the tag and every object it reaches, but leaves the remote `master` branch where it was. That is deliberate: the remote now has the release commit without any workflow having run on a `master` push.

6. **`git push -f origin v3`** (confirmation).

7. **Point the `release` branch at the release**, one force-push (confirmation):

   ```sh
   git push -f origin "v3.0.0^{}:refs/heads/release"
   ```

   `release` is a deprecated but still-documented way to track the latest tag (`@release` in the README). Today it has unrelated history from `master` - its own old force-push lineage - so the plain push the workflow's alias step makes is rejected. This one force fixes that for good; every later release fast-forwards. Alias from the tag, never from `master`.

8. **`git push origin master`** (confirmation). **Last** of the setup pushes - merging PR B at step 11 is a push to `master` too, and that one is meant to release. This is the first push that can reach the `release` job and pass its guard. The guard passes now because `v3.0.0` is reachable from `HEAD`; `semantic-release` finds it as the baseline with no commits after it and releases nothing, which is the correct outcome. *Stops here if* steps 5 to 7 did not all land - check `git ls-remote` first and finish them, rather than letting the workflow discover the gap.

9. **`gh release create v3.0.0 --generate-notes`** (confirmation). Public and irreversible.

10. **Run the dry run as the gate on everything after this.** The workflow guard stops the worst outcome; it does not tell you which version you would get. On a fresh checkout of `master` with a `GITHUB_TOKEN` in the env:

    ```sh
    git fetch --tags
    npm ci
    npx semantic-release --dry-run --no-ci
    ```

    `npm ci` is not optional here. `@semantic-release/exec` is a devDependency of this repository rather than part of semantic-release core, so on a fresh checkout `npx` fetches semantic-release alone, plugin resolution fails, and the run aborts before it ever prints the line you came for.

    Read the **baseline**, not the next version. The run prints a couple of dozen lines; these are the two that matter. At this point `master` is exactly the `v3.0.0` commit, so they should read

    ```
    Found git tag v3.0.0 associated with version 3.0.0 on branch master
    There are no relevant changes, so no new version is released.
    ```

    Releasing nothing is the pass: there is nothing after the tag to release. The two failures are `No git tag version found on branch master` followed by a `1.0.0` - step 3 did not take - and `Found git tag v2.1.1 associated with version 2.1.1` followed by a `2.x` - the link is there but `v3.0.0` is not reachable, so step 5 or step 8 did not land. *Stops here* on either: no further push to `master` until the baseline reads `3.0.0`. Once PR B is merged the same command on `master` names `3.0.0` as the last release and a `3.x` as the next one. `test-docs/revive-v3.md` records this gate too.

11. **Squash-merge PR B.** Only now. Its push to `master` is the first real automated release.

    Squash, not merge or rebase, and the same goes for PR A at step 1. Both branches were built with commit trailers naming an assistant, which this repository's owner does not want in its history: 14 such lines across PR A's 17 commits and 42 across PR B's. A squash merge writes one fresh commit message and drops every one of them; a merge or rebase carries them onto `master` permanently. Check the squash message GitHub proposes before confirming - it concatenates the branch's commit bodies by default, so the trailers reappear there unless you clear it and write the message yourself.

## Re-running the aliases on their own

If `semantic-release` tagged and published but the alias step failed - a diverged `release` branch, an expired token, a cancelled run - do not release again. Run the CI workflow with `workflow_dispatch` and give it the version that was released (e.g. `3.0.2`). That path skips `test`, `dist-check`, `e2e` and `semantic-release` and runs the alias movement alone. Running it against a version whose aliases are already correct is a clean no-op.

That dispatch is single-purpose: it re-aliases an already released version and nothing else. It cannot be used to re-run CI on `master`. Its `version` input is `required: true`, so there is no way to start it without naming a release, and none of the three test jobs run on it: `test` and `dist-check` carry `if: github.event_name != 'workflow_dispatch'`, and `e2e` skips for its own reason - its condition admits only `push` and same-repository `pull_request`. To re-run the tests, re-run the workflow run itself from the Actions tab, or push a commit.

If the alias step failed because `release` has diverged, the plain push will keep failing until someone decides what happened to that branch. Once the divergence is understood, put `release` back on the released commit with one force-push, then re-run the dispatch:

```sh
git push -f origin "v$ARGUMENTS^{}:refs/heads/release"
```

Owner confirmation, like any force-push. Use the tag, not `master`: by the time you are recovering, `master` may be several commits past the release, and `git push -f origin master:release` would alias `@release` to code that was never released. The `^{}` resolves the tag to its commit whichever way the tag was made.

## Manual fallback: tag by hand

Use this when the workflow itself is broken. For the first `v3.0.0` follow the sequence above instead - it is this procedure with the ordering constraint that only applies before the first release.

1. Preconditions: `git status --short` empty, current branch `master`, CI green on the commit being released (`gh run list --branch master --limit 1`).
2. Run `npm run all` (clean, build, format, lint, package, test) with `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` set. Stop on any failure and show the output; without those three set the live-API tests in `src/main.test.ts` skip themselves, so say so and stop rather than releasing untested.
3. `git diff --exit-code dist/` must be clean after that rebuild. Same check as CI's `dist-check`. A non-empty diff here is unexpected - investigate rather than committing a release-time rebuild.
4. Tag: `git tag -a v$ARGUMENTS -m "v$ARGUMENTS"`.
5. Move the floating major tag onto the same commit: `git tag -f v3 "v$ARGUMENTS^{}"`. The `^{}` matters - without it `v3` ends up pointing at the annotated tag object rather than the commit.
6. Push, each with its own confirmation - approving one is not approval of the next:
   - `git push origin v$ARGUMENTS`
   - `git push -f origin v3`
   - `git push origin "v$ARGUMENTS^{}:refs/heads/release"`
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
