# Engineering updates and releases

An engineering update should leave a reviewable commit, changelog entry, reproducible verification result and clear release status. Do not publish unsupported performance, profit or availability claims.

## Verification sequence

Use Node.js 24 and the committed lockfiles:

```sh
npm ci --ignore-scripts
npm ci --prefix neural-frontier --ignore-scripts --include=dev
npm run verify
```

The verification command scans tracked and non-ignored candidate files, checks historical/current integrity, checks JavaScript syntax, runs the tests and builds the static output. GitHub Actions runs the same sequence without backend credentials or live provider requests. Browser/production integration checks are separate evidence.

The scanner reports no matched values. Fix findings before staging; use `node scripts/secret-scan.cjs --staged` as a final index check. Do not post secret values in public issues or CI logs. A pattern scanner cannot establish that arbitrary source is secret-free.

## Production provenance

`docs/production-source.json` is immutable evidence for production baseline `eadb508d86a19f097759268dc5e2977a601ef7c5`. The verifier reads that original commit from full Git history and checks its 103 hashes. It also checks 27 approved frontend hashes in the current checkout.

Current application files must remain byte-identical to the baseline. The only explicit engineering metadata exception is adding the exact `verify` script to `package.json`; original scripts, dependencies and other metadata cannot change under this exception. The command reports this exception separately rather than pretending its working-tree hash is unchanged.

For a future intentional application release, create new reviewed provenance evidence and update the verifier policy in its own clearly explained commit. Preserve the original snapshot and history. Do not rewrite old hashes merely to silence a failing check.

## Review process

1. Create a focused branch and preserve existing work.
2. Update `CHANGELOG.md` under `[Unreleased]`.
3. Run verification and include the actual counts and commands in the PR.
4. Require a green `verify` result before maintainer integration. This is repository policy; it is not a claim that branch protection is configured.
5. Review publication scope, context integrity and the diff. Never publish private backend code, operational settings, credentials, logs or user data.
6. Integrate without force-pushing or rewriting reviewed history. For a strict fast-forward, use `git merge --ff-only` and an ordinary push; GitHub's merge button does not guarantee a fast-forward.
7. Verify remote `main`, its CI result and the current production deployment separately.

No new license, DCO requirement or assignment of contributor rights is introduced by this process. Retain existing contributor notices and permissions.

## Release preparation

- Use a calendar tag such as `v2026.11.26` after verification, and record the exact repository commit.
- Distinguish the release commit from the historical production baseline and the live deployment ID.
- Prepare a draft GitHub release with notes covering scope, tests, integrity, limitations and production impact.
- A draft is not a published release. Publishing or deploying must be reported accurately; a repository tag alone does not prove a production deployment.
- Preserve the synchronization branch until remote main, CI and production have been verified. Retention is acceptable; automatic branch deletion is not required.

## Public update template

```text
Change: <concrete behavior or engineering improvement>
Reason: <verified problem>
Evidence: <commands, actual counts and CI link>
Commit / release: <exact references and draft/published status>
Production impact: <unchanged, deployed, or not verified>
Limitations: <specific unsupported or unavailable capabilities>
```

Publishing a social post, scheduling updates or deploying infrastructure is not performed automatically by this workflow.
