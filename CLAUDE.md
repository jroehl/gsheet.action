# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action that runs a JSON list of Google Sheets CRUD commands. `src/` is only a dispatcher: it validates the `commands` input against `src/config.ts` and calls methods of the `GoogleSheet` class from `google-sheet-cli` (same author, separate repo). All Sheets logic lives there. A bug in a sheet operation is fixed in that repo, released to npm, then bumped here.

## Commands

- `npm run all` runs clean, build, format, lint, package, test. Run it before committing; CI fails on any diff left after build.
- `npm test` runs jest. `src/main.test.ts` calls the real Sheets API and needs `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` in the env; it skips itself without them, so `src/lib.test.ts` and `src/main.offline.test.ts` are the offline suite. The live path is covered by the `e2e` job, which loads the credentials from 1Password (`op://service-account/github.actions/*`) and does not run for fork PRs.
- `npm run package` builds `lib/` and bundles `lib/main.js` into `dist/index.js` with ncc. `action.yml` runs that file. `dist/` is committed: it is what users execute, and CI fails if it does not match `src/`.
- `npm run document` regenerates the README block between `<!-- commands -->` and `<!-- commandsstop -->` from `src/config.ts`. Never edit that block by hand.
- The husky pre-commit hook runs `document` and `package` and then refuses the commit if `README.md` or `dist/` changed. It never stages anything; add the rebuilt files yourself and commit again.

## Conventions

- Adding a command: add it to both `Func` and `commands` in `src/config.ts`. `google-sheet-cli` must expose a method of the same name. `required` and `optional` args are positional; `options` args are collected into one object placed between them in `kwargs`.
- Set `TEST=1` in the env to import `src/main.ts` without executing `run()`.

## Release

The `release` and `preview/*` force-push machinery is gone: `.github/workflows/ci.yml` only tests, checks `dist/` and runs the e2e. Releasing is tag-based (`dist/` is already in the tree, tag `vX.Y.Z`, move the major tag); the semantic-release job that automates it is not wired up yet.

## Status (2026-09-07)

Revival in progress. `action.yml` declares `node24`, arguments are coerced to the type their descriptor declares, `outputFile` keeps an oversized result from failing the step, and `dist/` is committed. Remaining sequence:

1. Release `google-sheet-cli` 2.3.0 (fix release off its master).
2. Modernize both repos' toolchains and this repo's CI, then tag `v3.0.0` here.
3. Close issues #611, #612, #616, #617 and PR #615.
