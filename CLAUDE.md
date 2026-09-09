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

The one-time setup this needed is done: the pre-v3 tag history was linked onto `master`
with a `merge -s ours`, `v3.0.0` and `v3` were tagged and pushed before `master`, and the
`release` branch took its one force-push onto the tag so later pushes fast-forward. None of
it can happen again, and the detail lives in `.claude/skills/release/SKILL.md`. What still
matters day to day: the `release` job refuses to run `semantic-release` unless a `v3.*` tag
is reachable from `HEAD`, and the alias step refuses a version off the v3 line. Both patterns
have to be raised at v4.

Because merges here are squashed, `semantic-release` only ever reads the squash subject, never
the branch's commits. The subject is the release decision - a branch carrying a `fix:` merged
under a `chore:` subject releases nothing, which is what happened on #619 and was correct there.

## Status (2026-09-09)

`v3.0.0` is released. `master`, `release`, the `v3` alias and the `v3.0.0` tag all point at the
same commit, and releases are now cut by CI on a push to `master`. The action runs on `node24`,
arguments are coerced to the type their descriptor declares, `outputFile` keeps an oversized
result from failing the step, and `dist/` is committed.

`google-sheet-cli` 2.3.0 and 3.0.0 are both published; 3.0.0 carries SLSA provenance from OIDC
trusted publishing, with no npm token anywhere.

What is left:

1. This branch: `google-sheet-cli` 3, which takes `dist/index.js` from 24.3 MiB to 1.8 MiB and
   closes #611. It has to release as a minor, so the squash subject needs a `feat:`.
2. Restore `master`'s branch protection. It was relaxed to land #618 and never put back:
   required contexts should be `test`, `dist-check` and `e2e`, and `allow_force_pushes` false.
   Leave the approving-review requirement off while one person maintains this, or every merge
   needs an admin override.
