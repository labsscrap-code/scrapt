# Changelog

Changes are recorded with reproducible evidence. Repository releases use calendar tags (`vYYYY.MM.DD`, with a suffix for an additional release that day).

## [Unreleased]

### Added

- Permanent `AGENTS.md` instructions for tested, security-reviewed GitHub synchronization, CI verification for the latest commit and explicit separation from production deployment.
- Reproducible GitHub Actions verification on Ubuntu 24.04 and Node.js 24, installing both locked dependency trees.
- Fail-closed secret and production-integrity checks, with 12 focused verification regression tests.
- Release notes, a pull request template and an engineering publication runbook adapted from the independently reviewed HERMES package.

### Changed

- `main` fast-forwarded to the original production synchronization commit `eadb508d86a19f097759268dc5e2977a601ef7c5`, preserving its ancestry and evidence.
- Repository verification is available through `npm run verify` after both dependency installations.
- Documentation distinguishes the historical production snapshot from engineering-only repository changes.

### Security

- Secret findings report path, line and rule only; matched credential values are not echoed.
- Missing/empty manifests, changed historical evidence and unexpected application changes fail verification.
- Workflow actions are pinned to reviewed official revisions; workflow permissions are read-only and checkout credentials are not persisted.
- No license, contributor-rights assignment, trading capability or production deployment is added.

## Production baseline — 2026-11-26

Commit: [`eadb508`](https://github.com/labsscrap-code/scrapt/commit/eadb508d86a19f097759268dc5e2977a601ef7c5).

### Included

- Static Unified Terminal V3 with Terminal, Neural Frontier and locked Execution views.
- Standalone ETH Sentiment Console, Micro Replay, Field Notes and retained conceptual research HUD.
- Existing restricted Vercel integration and the server-side Scrappy English interpretation path.
- Updated landing navigation, approved visual assets, routing and scoped security headers.

### Independently reproduced

- Clean root and Neural Frontier dependency installations.
- 148 baseline tests, syntax checks and production build passed.
- 103 historical source hashes and 27 approved frontend hashes matched. These are 130 checks with overlapping files, not 130 unique files.
- No findings from the reviewed tracked-tree secret scan. Pattern scanning is not a guarantee that every possible secret can be detected.

### Limitations retained

- Execution remains locked and read-only. Wallet code does not sign or submit transactions.
- Developer-declared performance figures are not independently verified live trading profits.
- Fee projections are not confirmed collections or paid distributions.
- Scrappy depends on available backend context, explicit activation and provider quotas; ETH-specific AI analysis is not claimed as verified.
- Research notes and learnings may use browser storage. Credentials must not be stored there.
