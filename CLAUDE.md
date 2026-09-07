# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action that runs a JSON list of Google Sheets CRUD commands. `src/` is only a dispatcher: it validates the `commands` input against `src/config.ts` and calls methods of the `GoogleSheet` class from `google-sheet-cli` (same author, separate repo). All Sheets logic lives there. A bug in a sheet operation is fixed in that repo, released to npm, then bumped here.

## Commands

- `npm run all` runs clean, build, format, lint, package, test. Run it before committing; CI rebuilds the bundle and fails if the committed `dist/` does not match it.
- `npm test` runs jest. `src/main.test.ts` calls the real Sheets API and needs `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` in the env; it skips itself without them, so `src/lib.test.ts` and `src/main.offline.test.ts` are the offline suite. The live path is covered by the `e2e` job, which loads the credentials from 1Password (`op://service-account/github.actions/*`) and does not run for fork PRs.
- `npm run package` builds `lib/` and bundles `lib/main.js` into `dist/index.js` with ncc. `action.yml` runs that file. `dist/` is committed: it is what users execute, and CI fails if it does not match `src/`.
- `npm run document` regenerates the README block between `<!-- commands -->` and `<!-- commandsstop -->` from `src/config.ts`. Never edit that block by hand.
- The husky pre-commit hook runs `document` and `package` and then refuses the commit if `README.md` or `dist/` changed. It never stages anything; add the rebuilt files yourself and commit again.

## Conventions

- Adding a command: add it to both `Func` and `commands` in `src/config.ts`. `google-sheet-cli` must expose a method of the same name. `required` and `optional` args are positional; `options` args are collected into one object placed between them in `kwargs`.
- Set `TEST=1` in the env to import `src/main.ts` without executing `run()`.

## Release

The `release` and `preview/*` force-push machinery is gone: `.github/workflows/ci.yml` only tests, checks `dist/` and runs the e2e. Releasing is tag-based and manual; the procedure lives in `.claude/skills/release/SKILL.md`.

No `v1.x`/`v2.x` tag is an ancestor of `master` - the release-branch history and the tag history diverged before this repo moved to tag-based releases. The first `v3` release needs a one-time `git merge -s ours --allow-unrelated-histories v2.1.1` on `master` to link them, or `semantic-release` would read `master` as having no prior release and cut `1.0.0`. The `release` branch (the deprecated `@release` alias) similarly has unrelated history and needs one force-push to become an ancestor of `master`; every later update is a plain fast-forward. All git pushes are the repository owner's action, each needing confirmation for that specific push - the skill documents the steps but never runs them.

## Status (2026-09-07)

Revival in progress. `action.yml` declares `node24`, arguments are coerced to the type their descriptor declares, `outputFile` keeps an oversized result from failing the step, and `dist/` is committed. The release skill, README and this file describe the `v3.0.0` procedure; the tag itself, the history-linking merge and all pushes are still to be done by the repository owner. Remaining sequence:

1. Release `google-sheet-cli` 2.3.0 (fix release off its master).
2. Owner runs the `release` skill for `3.0.0`: link history, tag `v3.0.0`, move `v3`, alias `release`.
3. Close issues #611, #612, #616, #617 and PR #615.
