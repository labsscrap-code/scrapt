# Repository synchronization and release runbook

Adapted from HERMES after independent verification. No force push, history rewrite or automatic branch deletion is part of this procedure.

## Preconditions

- Confirm the intended GitHub identity and write permissions using the existing secure local authentication.
- Fetch remote state and inspect local changes. Preserve unrelated/unpublished work.
- Verify source security and reproducible checks from a clean checkout.
- Inspect the Vercel project's actual Git connection and production branch. Do not infer deployment safety from repository documentation alone.
- Stop before updating a deployment-connected branch if it would cause an unauthorized production deployment.

## Strict production synchronization

```sh
git fetch origin
git switch main
git pull --ff-only
git merge-base --is-ancestor main origin/sync/terminal-v3-production
git merge --ff-only origin/sync/terminal-v3-production
git push origin main
```

Compare the remote main SHA with the approved production commit. For the initial synchronization both were `eadb508d86a19f097759268dc5e2977a601ef7c5`. Later engineering commits are distinct and must not be described as the original production SHA.

## Engineering improvements

Create separate focused commits/PRs for verification and release documentation. Run `npm run verify`, wait for hosted CI and review the diff. Integrate without force-pushing. Verify that the original production commit remains an ancestor of main.

Keep `docs/production-source.json` intact. The integrity tool distinguishes the historical snapshot from explicitly permitted engineering metadata. Do not erase or overwrite evidence to make checks pass.

## Release and production check

- Confirm remote main and successful CI for its exact SHA.
- Tag the reviewed repository commit and prepare the GitHub draft release; do not claim a draft is published.
- Record baseline commit, repository release commit, test counts, CI run and live deployment separately.
- Verify expected public routes and the active Vercel deployment ID. No provider calls or trades are required for a repository-only release.
- Retain the synchronization branch. Never remove it before evidence, main, CI and production are verified.

## Recovery

If a repository-only change needs reversal, prepare a reviewed revert commit and run verification. Do not reset or force-push shared history. A Git revert does not itself roll back an independently deployed Vercel application. Production rollback is a separate authorized operation.
