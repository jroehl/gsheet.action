# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GitHub Action that runs a JSON list of Google Sheets CRUD commands. `src/` is only a dispatcher: it validates the `commands` input against `src/config.ts` and calls methods of the `GoogleSheet` class from `google-sheet-cli` (same author, separate repo). All Sheets logic lives there. A bug in a sheet operation is fixed in that repo, released to npm, then bumped here.

## Commands

- `npm run all` runs clean, build, format, lint, package, test. Run it before committing; CI fails on any diff left after build.
- `npm test` runs jest. `src/main.test.ts` calls the real Sheets API and needs `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` in the env. Without them only `src/lib.test.ts` passes. CI loads them from 1Password (`op://service-account/github.actions/*`), so fork PRs cannot pass CI.
- `npm run package` bundles `lib/main.js` into `dist/index.js` with ncc. `action.yml` runs that file. `dist/` is gitignored on master and only exists on release branches.
- `npm run document` regenerates the README block between `<!-- commands -->` and `<!-- commandsstop -->` from `src/config.ts`. The husky pre-commit hook runs it. Never edit that block by hand.

## Conventions

- Adding a command: add it to both `Func` and `commands` in `src/config.ts`. `google-sheet-cli` must expose a method of the same name. `required` and `optional` args are positional; `options` args are collected into one object placed between them in `kwargs`.
- Set `TEST=1` in the env to import `src/main.ts` without executing `run()`.
- `google-spreadsheet` in package.json is unused. Do not import it.

## Release

Decision 2026-09-07: replace the `release` and `preview/*` force-push machinery in `.github/workflows/test-and-release.yml` with a tag-based release (build `dist` in CI, commit it, tag `vX.Y.Z`, move the major tag). Until that lands, the old flow still runs on every push to master. Use `/release`.

## Status (2026-09-07)

Revival in progress. `action.yml` still declares `node16`. GitHub removes Node 20 from runners on 2026-09-16, so the published `v2.1.1` is broken for users. Planned sequence:

1. Bump `action.yml` to `node24`, rebuild, tag `v3.0.0`.
2. Modernize `google-sheet-cli` (move husky, semantic-release and oclif out of runtime deps, bump googleapis and oclif/core, check issue #455), release 3.0.0.
3. Bump it here, then close issues #611, #612, #616, #617 and PR #615.
