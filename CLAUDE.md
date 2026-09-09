# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action that runs a JSON list of Google Sheets CRUD commands. `src/` is only a dispatcher: it validates the `commands` input against `src/config.ts` and calls methods of the `GoogleSheet` class from `google-sheet-cli` (same author, separate repo). All Sheets logic lives there. A bug in a sheet operation is fixed in that repo, released to npm, then bumped here.

## Commands

- `npm run all` runs clean, build, format, lint, package, test. Run it before committing; CI rebuilds the bundle and fails if the committed `dist/` does not match it. CI runs the read-only halves of the same thing - `format-check` and `lint:check`, which is `lint` without `--fix`.
- `npm test` runs jest. `src/main.test.ts` calls the real Sheets API and needs `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` in the env; it skips itself without them, so `src/lib.test.ts` and `src/main.offline.test.ts` are the offline suite. The live path is covered by the `e2e` job, which reads the three values from repository secrets and does not run for fork PRs.
- `npm run package` builds `lib/` and bundles `lib/main.js` into `dist/index.js` with ncc. `action.yml` runs that file. `dist/` is committed: it is what users execute, and CI fails if it does not match `src/`.
- `npm run document` regenerates the README block between `<!-- commands -->` and `<!-- commandsstop -->` from `src/config.ts`. Never edit that block by hand.
- The husky pre-commit hook runs `document` and `package` and then refuses the commit if `README.md` or `dist/` changed. It never stages anything; add the rebuilt files yourself and commit again.

## Conventions

- Adding a command: add it to both `Func` and `commands` in `src/config.ts`. `google-sheet-cli` must expose a method of the same name. `required` and `optional` args are positional; `options` args are collected into one object placed between them in `kwargs`.
- Set `TEST=1` in the env to import `src/main.ts` without executing `run()`.

## Release

`.github/workflows/ci.yml` is the only workflow. Jobs `test`, `dist-check` and `e2e` run on pull requests and on pushes to `master`; `release` runs after them and only when all three are green and the push is to `master`. It runs `semantic-release` (config in `.releaserc`, branch `master`, commit-analyzer plus release-notes-generator plus github plus one `exec` that hands the version to the next step), then an `aliases` step that moves the `v3` tag and the deprecated `release` branch onto the released commit. The alias push to `release` does not force, so a diverged branch fails the job instead of being rewritten.

A `workflow_dispatch` with a `version` input skips the three test jobs and `semantic-release` and re-runs the alias movement alone. That is the recovery when a release tagged fine but the aliases did not land; re-running it on a correct release is a no-op.

A one-time setup has to happen by hand before any of that works, all of it the repository owner's and each push needing confirmation for that specific push. No `v1.x`/`v2.x` tag is an ancestor of `master` - the release-branch history and the tag history diverged - so `master` needs a one-time `git merge -s ours --allow-unrelated-histories v2.1.1`, or `semantic-release` reads it as having never released and cuts `1.0.0`. The `release` branch has unrelated history too and needs one force-push before the workflow's plain push can fast-forward it. **The order matters more than any single step: `v3.0.0` and `v3` are tagged locally and pushed first, and `git push origin master` comes last.** A `master` push made while only the linked v2 tags are reachable would let `semantic-release` cut `2.2.0` over v3 code and force the `v2` alias onto the breaking action - both permanent. The `release` job refuses to run `semantic-release` unless a `v3.*` tag is reachable from `HEAD`, which catches that mistake, and the guard's pattern has to be raised at v4. The whole sequence, the `semantic-release --dry-run` that gates the first automated release, the manual tagging fallback and rollback are in `.claude/skills/release/SKILL.md`.

## Status (2026-09-07)

Revival in progress. `action.yml` declares `node24`, arguments are coerced to the type their descriptor declares, `outputFile` keeps an oversized result from failing the step, and `dist/` is committed. The release skill, README and this file describe the `v3.0.0` procedure; the tag itself, the history-linking merge and all pushes are still to be done by the repository owner. Remaining sequence:

1. Release `google-sheet-cli` 2.3.0 (fix release off its master).
2. Squash-merge PR A (the v3.0.0 hotfix) into `master`.
3. Rebase this toolchain branch (PR B) onto the new `master` and re-verify the bundle. Do not merge it yet.
4. Owner runs the `release` skill for `3.0.0`, in its documented order: link the history locally, tag `v3.0.0` and move `v3` locally, then push `v3.0.0`, `v3` and the `release` alias, and only then `git push origin master`. Pushing `master` before `v3.0.0` exists is the one ordering mistake that publishes a wrong version permanently.
5. Owner creates the GitHub release, then runs `npm ci && npx semantic-release --dry-run --no-ci` on `master`. The gate is the baseline line, not the next version: it must read `Found git tag v3.0.0 associated with version 3.0.0 on branch master`. Releasing nothing is the pass - `master` is the tagged commit, so there is nothing after the tag to release. `No git tag version found` (then `1.0.0`) or `Found git tag v2.1.1` (then a `2.x`) is the failure. Until it passes, the `release` job must not run for real (`test-docs/revive-v3.md`).
6. Merge PR B. Not before step 5: it is a push to `master`, so `v3.0.0` has to be reachable from `master` first.
7. Close issues #611, #612, #616, #617 and PR #615.
