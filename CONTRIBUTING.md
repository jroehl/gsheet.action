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

Commit messages
---------------

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`, with `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `build` or `ci` as the type. This is not cosmetic - releases are cut automatically from `master` by semantic-release, which reads these messages to decide the version. A `fix:` becomes a patch, a `feat:` a minor, and a `BREAKING CHANGE:` footer a major. Anything else releases nothing.
