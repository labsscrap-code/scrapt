## Change and reason

<!-- Describe the concrete problem and resulting behavior. One purpose per PR. -->

## Verification

```sh
npm ci --ignore-scripts
npm ci --prefix neural-frontier --ignore-scripts --include=dev
npm run verify
```

<!-- Record actual results, commit SHA and CI URL. Do not copy old counts. -->

## Scope and safety

- [ ] No credentials, user data or private backend/trading code are published.
- [ ] Execution remains locked; no wallet signing, approvals or order placement is added.
- [ ] API access controls and data freshness protections remain intact.
- [ ] Changelog and relevant documentation reflect the actual change.
- [ ] Production impact is stated: unchanged, deployed with authorization, or not yet verified.

## Known limitations

<!-- Include failed, unavailable and untested checks. Do not call mocks live verification. -->
