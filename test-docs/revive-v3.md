# Deferred verification for the v3 revival

Checks that could not be run while the work was done, with the exact command and the
exact thing to look for. Each one is a gate: do not take the next step until it passes.

## semantic-release must be shown to cut the right version before it is trusted

`.releaserc` now points `semantic-release` at `master` instead of the old `release`
branch, so the version it cuts is decided by the tags reachable from `master`.

Today no tag is reachable from `master` at all - not `v2.1.1`, not anything older
(`git tag --merged master` prints nothing). The release-branch history and the tag
history diverged years ago. Until the one-time
`git merge -s ours --allow-unrelated-histories v2.1.1` from the `/release` skill is on
`master` and `v3.0.0` is tagged, `semantic-release` reads `master` as a repository that
has never released and will cut `1.0.0`, publishing a `v1` tag over the v1 line.

So the first automated release is gated. After the manual `v3.0.0` release has been cut
and pushed, and before any push to `master` is allowed to run a real release:

```sh
git fetch --tags
npx semantic-release --dry-run --no-ci
```

Read the baseline line first - the one that starts `Found git tag`. It must name
`v3.0.0`. Run immediately after the manual release, when `master` is exactly the tagged
commit, the whole output is

```
Found git tag v3.0.0 associated with version 3.0.0 on branch master
There are no relevant changes, so no new version is released.
```

and that is the pass: there is nothing after the tag to release yet. Once there are
commits after it the next version must be a `3.x` - `3.0.1` or `3.1.0` depending on the
commits - and never `1.0.0` or a `2.x`. `No git tag version found on branch master`
followed by `1.0.0` means the history link is missing. `Found git tag v2.1.1` followed by
a `2.x` means the link is there but `v3.0.0` is not reachable from the commit being
released, so the v2 line is being read as the baseline. Stop and fix either before
letting a real run happen.

There is a second, narrower version of the same trap, and it is why the `/release` skill
pushes `master` last. Right after the `ours` merge and before `v3.0.0` is pushed, every
v1 and v2 tag is reachable from `master` while no v3 tag is. A push to `master` in that
window runs a real release: measured against the branch's own commit-analyzer, 40 commits
in range, release type `minor`, next version **2.2.0** - a permanent tag and a published
GitHub release carrying v3 code, and then the alias step force-moving `v2` onto the
breaking v3 action.

The `release` job refuses on its own in both states: a step before `semantic-release`
fails the run when `git tag --merged HEAD --list 'v3.*'` is empty, so neither no tag nor
only pre-v3 tags can reach `semantic-release`. That pattern is tied to the current major
and has to be raised to `v4.*` when v4 is cut. The dry run is still the check to run,
because it tells you which version you are about to get; the step in the workflow only
stops the worst outcome.

The dry run needs a `GITHUB_TOKEN` (or `GH_TOKEN`) in the environment with read access
to the repository.

## The first `release` branch alias is a force-push the workflow will not do

The `aliases` step in `.github/workflows/ci.yml` moves `vN` with a forced tag push and
puts the released commit on the `release` branch with a plain, non-forcing push, so a
diverged branch fails the job loudly instead of being silently rewritten.

`release` today has unrelated history from `master`, so that plain push is rejected. The
one-time `git push -f origin "v3.0.0^{}:refs/heads/release"` in the `/release` skill has
to happen once, by hand and with the owner's confirmation, before the automated alias
step can succeed. Every release after that is a fast-forward. It aliases from the tag,
not from `master`, so `@release` can only ever point at code that was released.

Once a release run has finished, confirm the aliases from the remote rather than from
the job log:

```sh
git ls-remote --tags origin v3 vX.Y.Z
git ls-remote --heads origin release
```

How many lines `vX.Y.Z` prints depends on who made it. semantic-release creates a
lightweight tag, so an automated release prints one line and that line is already the
commit. The manual procedure creates an annotated tag with `git tag -a`, which prints
two: `refs/tags/vX.Y.Z` is the tag object and `refs/tags/vX.Y.Z^{}` is the commit.
Compare against the `^{}` line whenever there is one. `v3` is always lightweight, so its
single line is the commit. All of them must be the same commit as the `release` head.
