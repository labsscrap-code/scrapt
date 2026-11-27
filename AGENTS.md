# SCRAPT engineering workflow

These standing instructions apply to work in this repository. Treat GitHub synchronization as part of completing every approved fix, feature, integration and technical improvement. Synchronization is not authorization to deploy production.

## Start from the actual repository

- Read this file and the relevant technical documentation before editing.
- Inspect the Git root, status, branch and remotes. Fetch the latest remote state and reconcile it without overwriting existing work.
- Use a focused branch based on the appropriate current branch. Preserve uncommitted, proprietary and unpublished work; use an isolated checkout when necessary.
- Do not confuse a local release copy, generated build directory or private backend workspace with the authoritative Git repository.

## Implement and verify

- Keep changes focused and preserve existing application functionality, routes, security protections and production stability.
- Run all tests relevant to the change. For application or verification-tool changes, use the repository verification sequence with Node.js 24:

  ```sh
  npm ci --ignore-scripts
  npm ci --prefix neural-frontier --ignore-scripts --include=dev
  npm run verify
  ```

  Install dependencies when required by a clean checkout or dependency changes; do not reinstall a valid installation unnecessarily. Both lockfiles are required for a clean verification run.
- For documentation-only changes, run appropriate local security/integrity checks and still require successful hosted CI before merging.
- Report actual results. Distinguish mocked tests, real-provider checks, browser checks and production verification. Never label untested functionality as passing.
- Preserve historical production evidence. Follow `docs/ENGINEERING_UPDATES.md` and the integrity verifier's explicit policy; never rewrite old hashes simply to make a check pass.

## Review publication scope before staging

- Inspect the diff and exact candidate files for sensitive or proprietary information.
- Never publish credentials, tokens, environment values, private keys, seed phrases, private infrastructure configuration, databases, logs, user information or proprietary backend/trading algorithms.
- Keep private operational code and unrelated local downloads outside this public repository. Use reserved example addresses and clearly artificial test fixtures rather than operational targets.
- Preserve the reviewed Git ignore allowlist. Add only appropriate public paths when needed; do not weaken exclusions for secrets or runtime data.
- Run `node scripts/secret-scan.cjs` before staging and `node scripts/secret-scan.cjs --staged` before committing. Inspect findings without printing their values. Pattern scanning supplements review; it does not prove that every possible secret is absent.
- Stage explicit reviewed paths. Do not use blind `git add -A`. If an actual secret is found in tracked content or history, stop the public push, report the affected path safely and do not rotate credentials or rewrite history without authorization.

## Commit, publish and integrate

- Create descriptive commits that explain the concrete change. Separate unrelated purposes.
- Update `CHANGELOG.md` and relevant technical documentation when the change affects behavior, integration, verification, release process or known limitations.
- Publish approved, publicly disclosable changes to the existing `labsscrap-code/scrapt` repository as part of normal task completion. Use the verified intended GitHub identity; do not substitute another account or invent credentials.
- Open a focused pull request with the actual validation results and limitations. Prefer a body file for multiline descriptions.
- Verify successful required CI checks for the exact latest PR head SHA before integrating into `main`. A green run for an older commit is insufficient. If checks fail, fix relevant issues and rerun them; do not bypass the failure.
- Respect branch protections and review requirements. Use ordinary pushes and appropriate non-destructive merges. For strict fast-forward integration, use `git merge --ff-only`; do not assume the GitHub merge button guarantees it.
- Never force-push, reset shared work destructively or delete unrelated work/history. Retain release/synchronization evidence and branches until their required verification is complete.
- After integration, verify the actual remote main SHA and CI result. Do not claim GitHub is synchronized solely because a local commit exists.

## Keep production deployment separate

- A Git commit, push, merge, tag or release is not permission to deploy production. Deploy only when explicitly authorized by the user.
- Before pushing a branch that could trigger deployment, inspect the actual deployment/Git integration and production branch. If the push would cause an unauthorized production deployment, stop that action and explain the exact approval or configuration needed.
- Do not modify VPS services, domain settings, market pipelines, wallet permissions or restricted execution merely to complete repository synchronization.
- Do not activate trading, wallet signing or order placement as an incidental frontend or repository change.
- Preserve existing licensing and contributor rights. Do not introduce a license or assignment of rights without explicit authorization.

## Completion report

Report modified files, test/build/security results, commit SHA, PR and CI links, remote integration status, relevant documentation updates and production impact. State remaining blockers or excluded private changes clearly. Distinguish draft releases from published releases and repository synchronization from deployment.

If authentication, CI, review requirements or publication safety block completion, finish the independent safe work and report the specific blocker and minimum required user action. Do not claim completion prematurely.
