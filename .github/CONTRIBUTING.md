# Contributing to SCRAPT

Thank you for helping make SCRAPT clearer and more useful.

## Welcome contributions

- Corrections to public documentation and terminology.
- Clear, reproducible UX/UI feedback.
- Accessibility observations and responsive-layout suggestions.
- Improvements to the conceptual architecture overview and roadmap wording.

## Before opening an issue

Check existing issues and explain the expected outcome. For UX feedback, describe the workflow, the difficulty and the practical impact. Include only sanitized examples that you are authorized to publish.

Do not attach application source, credentials, account information, runtime logs, databases, snapshots or executable files. Sensitive security reports belong in a private channel; read the [security policy](SECURITY.md).

## Pull requests

Keep each change focused. Explain what changed and why, check links and spelling, and keep claims consistent with verified product behavior. Describe planned features as proposals rather than shipped functionality.

This repository includes explicitly approved frontend source, restricted server integration, tests and documentation. Do not add private backend code, infrastructure configuration, credentials or unrelated assets. Expanded publication scope requires explicit maintainer approval; the Git ignore allowlist maintains that boundary.

Contributing does not authorize publishing implementation or assets belonging to another contributor. Confirm release permission before proposing new material.

## Reproducible review

Use Node.js 24, install both locked dependency trees, then run `npm run verify`. Include the exact CI run, commands and actual results in the pull request. See [engineering updates](../docs/ENGINEERING_UPDATES.md) for provenance and release handling. Update `CHANGELOG.md` under `[Unreleased]`; keep one purpose per PR and disclose unavailable or untested checks.

Do not add transaction signing, token approvals, order execution, credentials or private backend code. Execution remains locked. No new DCO requirement, assignment of rights or software license is introduced here. Existing contributor permissions and third-party notices remain applicable.
