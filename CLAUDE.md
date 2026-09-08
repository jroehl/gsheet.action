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

## Credentials and quota

The three `GSHEET_*` values are plain repository secrets. They used to be fetched at runtime from 1Password, but that service account was deleted in September 2026 and the vault behind it retired, so any workflow step still calling `1password/load-secrets-action` fails with `(403) Service Account Deleted`. 1Password remains the source of truth on the owner's workstation (`op://dev-secrets/.env.gsheet.action.prd/*`); values are pushed into GitHub by hand.

The Google identity is `gsheet-ci@gsheet-ci.iam.gserviceaccount.com`, in its own project holding nothing but the Sheets API. It has **no project IAM roles** on purpose: the library asks only for the `spreadsheets.google.com/feeds/` scope, so the account's entire reach is whichever spreadsheets are shared with it directly. A key leaked from this public repository therefore reaches one throwaway sheet and nothing else. Adding roles, or reusing an account from a project with other APIs enabled, throws that away.

Sheets defaults to **60 reads per minute per user**, and a self-service consumer override cannot exceed that — the project-level 300 is a separate limit and never the binding one, since CI authenticates as a single service account. Going above 60 takes a billing account on the project and a support request, both done on 2026-09-09: reads are now **300 per minute per user**. Writes are still 60, and since `google-sheet-cli` 2.3.0 every write costs an extra read for grid sizing, so a long `commands` list can still meet a limit. 3.x waits out a 429 with backoff, taking about a minute; before that it failed outright.

## Bundling

`ncc` code-splits: `dist/index.js` loads sibling `<id>.index.js` chunks by a filename it builds at runtime. A chunk nobody committed is untracked, so `git diff --exit-code dist/` does not see it and the action breaks only on the code path that needs it. `dist-check` and the pre-commit hook therefore fail on untracked files under `dist/` as well as on modified ones. Never delete a `dist/` chunk because it looks unreferenced.

## Release

`.github/workflows/ci.yml` is the only workflow. Jobs `test`, `dist-check` and `e2e` run on pull requests and on pushes to `master`; `release` runs after them and only when all three are green and the push is to `master`. It runs `semantic-release` (config in `.releaserc`, branch `master`, commit-analyzer plus release-notes-generator plus github plus one `exec` that hands the version to the next step), then an `aliases` step that moves the `v3` tag and the deprecated `release` branch onto the released commit. The alias push to `release` does not force, so a diverged branch fails the job instead of being rewritten.

A `workflow_dispatch` with a `version` input skips the three test jobs and `semantic-release` and re-runs the alias movement alone. That is the recovery when a release tagged fine but the aliases did not land; re-running it on a correct release is a no-op.

A one-time setup has to happen by hand before any of that works, all of it the repository owner's and each push needing confirmation for that specific push. No `v1.x`/`v2.x` tag is an ancestor of `master` - the release-branch history and the tag history diverged - so `master` needs a one-time `git merge -s ours --allow-unrelated-histories v2.1.1`, or `semantic-release` reads it as having never released and cuts `1.0.0`. The `release` branch has unrelated history too and needs one force-push before the workflow's plain push can fast-forward it. **The order matters more than any single step: `v3.0.0` and `v3` are tagged locally and pushed first, and `git push origin master` comes last.** A `master` push made while only the linked v2 tags are reachable would let `semantic-release` cut `2.2.0` over v3 code and force the `v2` alias onto the breaking action - both permanent. The `release` job refuses to run `semantic-release` unless a `v3.*` tag is reachable from `HEAD`, which catches that mistake, and the guard's pattern has to be raised at v4. The whole sequence, the `semantic-release --dry-run` that gates the first automated release, the manual tagging fallback and rollback are in `.claude/skills/release/SKILL.md`.

## Status (2026-09-09)

Revival in progress. `action.yml` declares `node24`, arguments are coerced to the type their descriptor declares, `outputFile` keeps an oversized result from failing the step, and `dist/` is committed. Nothing here is released yet: no push, tag or merge has happened on this repository.

`google-sheet-cli` 2.3.0 is published, so step 1 below is done. Its 3.0.0 is merged to that repo's master and no longer blocked — the quota that held it back was raised on 2026-09-09 — but the publish has not been re-run yet.

Three branches stack in this order, each on the one before: `worktree-init-claude-md` (PR A, the v3.0.0 hotfix), `toolchain` (PR B), and `cli-3` (the bump to `google-sheet-cli` 3, which shrinks `dist/index.js` from 23.8 MiB to 1.8 MiB). `cli-3`'s lockfile still pins the 2.x library on purpose — it cannot be regenerated until 3.0.0 is on npm, so that branch's CI cannot pass before then.

Remaining sequence:

1. ~~Release `google-sheet-cli` 2.3.0.~~ Done.
2. ~~Migrate `.github/workflows/ci.yml` off `1password/load-secrets-action` onto the repository secrets.~~ Done, on PR A.
3. Squash-merge PR A into `master`. Squash, not merge: the branches carry assistant attribution trailers this repository's history is not meant to contain, and GitHub's proposed squash message concatenates the commit bodies, so clear it and write the message by hand.
4. Rebase PR B onto the new `master` and re-verify the bundle. Do not merge it yet.
5. Owner runs the `release` skill for `3.0.0`, in its documented order: link the history locally, tag `v3.0.0` and move `v3` locally, then push `v3.0.0`, `v3` and the `release` alias, and only then `git push origin master`. Pushing `master` before `v3.0.0` exists is the one ordering mistake that publishes a wrong version permanently.
6. Owner creates the GitHub release, then runs `npm ci && npx semantic-release --dry-run --no-ci` on `master`. The gate is the baseline line, not the next version: it must read `Found git tag v3.0.0 associated with version 3.0.0 on branch master`. Releasing nothing is the pass - `master` is the tagged commit, so there is nothing after the tag to release. `No git tag version found` (then `1.0.0`) or `Found git tag v2.1.1` (then a `2.x`) is the failure. Until it passes, the `release` job must not run for real (`test-docs/revive-v3.md`).
7. Merge PR B. Not before step 6: it is a push to `master`, so `v3.0.0` has to be reachable from `master` first.
8. Once `google-sheet-cli` 3.0.0 publishes, regenerate `cli-3`'s lockfile and merge it as 3.1.0.
9. Delete the remote `preview/*` branches, close the dependabot PRs on both repositories, and close issues #611, #612, #616, #617 and PR #615.
