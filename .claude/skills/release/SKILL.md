---
name: release
description: Cut a tag-based release of the action. Builds and packages dist, commits it, tags vX.Y.Z and moves the major tag. Never pushes without explicit confirmation.
disable-model-invocation: true
---

Release version `$ARGUMENTS` (a semver like `3.0.0`, no `v` prefix). If no argument was given, stop and ask for the version.

1. Refuse unless the working tree is clean and the current branch is `master`. Print `git status --short` if it is not.
2. Run `npm run all`. Stop on any failure and show the output. The live-API tests need `GSHEET_CLIENT_EMAIL`, `GSHEET_PRIVATE_KEY` and `TEST_SPREADSHEET_ID` in the env; if they are missing, say so and stop rather than releasing untested.
3. Confirm `action.yml` declares `runs.using: node24` and `dist/index.js` exists after packaging.
4. Create the release commit on a branch named `release/v$ARGUMENTS`: temporarily remove the `dist` line from `.gitignore`, `git add -A`, commit as `chore(release): v$ARGUMENTS`.
5. Tag: `git tag -a v$ARGUMENTS -m "v$ARGUMENTS"` and force-move the major tag, e.g. `git tag -f v3`.
6. Show the user the exact push commands and stop:

   ```
   git push origin release/v$ARGUMENTS
   git push origin v$ARGUMENTS
   git push -f origin v3
   ```

   Do not run them. Pushing needs the user's explicit confirmation for that specific push.

After the push, verify with `git ls-remote --tags origin` rather than the push output, then create the GitHub release with `gh release create v$ARGUMENTS --generate-notes`.
