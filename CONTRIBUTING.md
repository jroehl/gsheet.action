Contributing to gsheet.action
=========================================

I welcome all contributions to gsheet.action

Issues
------

Feel free to submit issues and enhancement requests.

Contributing
------------

Please refer to each project's style guidelines and guidelines for submitting patches and additions. In general, I follow the "fork-and-pull" Git workflow.

 1. **Fork** the repo on GitHub
 2. **Clone** the project to your own machine
 3. **Commit** changes to your own branch
 4. **Push** your work back up to your fork
 5. Submit a **Pull request** so that we can review your changes

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

Before you push
---------------

Run `npm run all`. It cleans, builds, formats, lints, rebuilds the bundle and runs the tests. `dist/` is committed - it is the file users actually execute - so commit whatever `npm run all` rebuilds there. CI fails if it does not match the sources. The pre-commit hook runs the same rebuild and refuses the commit if `README.md` or `dist/` changed without being staged.

`README.md`'s command reference is generated from `src/config.ts` by `npm run document`. Never edit the block between `<!-- commands -->` and `<!-- commandsstop -->` by hand.

Adding a dependency
-------------------

After `npm install <pkg>`, check what it did to the lockfile: `git diff --numstat package-lock.json`. The third column is the file name and the second is removed lines - it should be `0`. npm sometimes drops optional peer entries it decides this machine does not need, which leaves the lockfile internally inconsistent. Nothing complains locally; it surfaces as `npm ci` failing in CI with "Missing: … from lock file", long after the mistake. If there are removals, restore the lockfile, re-add the dependency, and keep only the additions.

Dependabot
----------

Dependabot opens one grouped PR a month for minor and patch updates, plus a separate PR per major. `@actions/core` and `google-sheet-cli` are ignored: both are bundled into the committed `dist/`, which Dependabot cannot rebuild, so its PRs would always fail `dist-check`. Bump those two by hand and commit the rebuilt bundle with the version change. Note that an `ignore` entry silences Dependabot's security PRs for a package as well as its version updates, so those two are not covered by automatic security updates - watch the Dependabot alerts tab for them.

The ignore list only covers the dependencies that are *always* in the bundle. A `@vercel/ncc` or `typescript` bump changes the bundle's own output - a different bundler or a different emit - so the grouped monthly PR fails `dist-check` for exactly the same structural reason, just not every month. That PR is not broken: check out its branch, run `npm run package`, and commit and push the rebuilt `dist/` onto it.

The `e2e` job does not run on Dependabot's pull requests. Its branch is in this repository, but GitHub runs Dependabot-triggered workflows with fork-level access, so `secrets.OP_SERVICE_ACCOUNT_TOKEN` would resolve empty and every one of those PRs would carry a red check nobody can fix. If live coverage on them is ever wanted, store the same token as a **Dependabot** secret (repository settings, Secrets and variables, Dependabot) and drop the `github.actor != 'dependabot[bot]'` clause from the `e2e` condition in `.github/workflows/ci.yml`.

Commit messages
---------------

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`, with `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `build` or `ci` as the type. This is not cosmetic - releases are cut automatically from `master` by semantic-release, which reads these messages to decide the version. A `fix:` becomes a patch, a `feat:` a minor, and a `BREAKING CHANGE:` footer a major. Anything else releases nothing.
