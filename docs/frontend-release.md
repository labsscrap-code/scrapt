# Approved production frontend

This branch synchronizes the approved SCRAPT frontend served at [www.scrapt.xyz](https://www.scrapt.xyz). Production was deployed from an isolated static release directory using Vercel CLI, independently of Git pushes. The source hashes are recorded in [production-source.json](production-source.json).

## Build and checks

Use Node.js 24 and npm. Both dependency lockfiles are committed.

```sh
npm ci --ignore-scripts
npm ci --prefix neural-frontier --ignore-scripts --include=dev
npm test
npm run lint
npm run build
```

The build verifies approved asset hashes, copies static frontend files, bundles the retained React HUD with its isolated dependencies and generates Field Notes pages. Generated `public/` output and `node_modules/` are not committed. The original Neural Frontier package README describes its historical source project; use the root commands above for this integration.

## Routes and modules

| Route | Approved experience |
| --- | --- |
| `/` | Landing, animated artwork/background, live ticker and public navigation |
| `/terminal` | Unified Terminal V3 market dashboard and Scrappy widget |
| `/neural-frontier` | Temporary redirect to `/console/dashboard.html?view=neural`; avoids a collision with the retained legacy directory index |
| `/execution` | V3 read-only Execution view; remains LOCKED |
| `/console/dashboard.html` | Same static V3 app with `view=terminal`, `neural` or `exec` |
| `/console/console.html` | Standalone ETH sentiment console |
| `/micro-replay` | Real historical ETH/USDT replay and local research notes |
| `/field-notes` | Research library and linked article |
| `/neural-frontier/index.html` | Retained conceptual HUD, Edge Discovery and embedded console; not the primary V3 route |

Browser simulation in the legacy HUD is explicitly conceptual. Edge Discovery does not fabricate opportunities when its validated feed is unavailable. Execution does not place orders, request token approvals or sign transactions. The developer-declared performance snapshot is not independently verified live profit. Fee allocations are hypothetical; this source synchronization does not change on-chain taxes.

## Deployment boundary

`vercel.json` preserves the approved routing, narrowly scoped CSP and function duration. `api/proxy.js` and `lib/` are public-reviewed Vercel integration code, not the private Python backend. They enforce route/method/origin allowlists, verified upstream TLS, secure host-only cookies and no-store responses.

Only variable **names**, never production values, belong here:

- `SCRAPT_UPSTREAM_IP`
- `SCRAPT_UPSTREAM_TLS_NAME`
- `SCRAPT_UPSTREAM_ORIGIN`
- `SCRAPT_PUBLIC_ORIGIN`
- `SCRAPT_SCRAPPY_ENABLED` (explicit activation gate)
- Vercel-provided deployment hostname variables used by the origin allowlist

No deployment linkage, credentials or VPS installation files are included. Configure an approved environment privately; a clean checkout intentionally does not contain enough information to address the production backend automatically.

The existing Vercel project was not Git-linked when this synchronization was prepared. Pushing this branch is not a production deployment. Merging or connecting automatic deployments is a separate review/operational decision; do not redeploy simply to synchronize source.

## Scrappy scope

The current public response path preserves the existing VPS conversation, market context and durable limits. For legacy Spanish AI interpretations, an additional bounded server-side call to the same Kilo/Nemotron free model produces English commentary. Numeric observations remain server-rendered and unchanged. The model is accepted only while its live catalog reports that exact model as free with zero token prices; no paid fallback exists.

Native English responses bypass this extra translation call. Provider errors, quotas, invalid output and unavailable context remain honest unavailable states. The inspected public AI catalog is BTC-oriented; ETH-specific AI analysis is not asserted as verified. No new market collection or execution is included.

## Publication scope and verification

Included: approved static frontend, necessary public assets, restricted Vercel integration, original retained HUD source, build scripts, lockfiles, public article content and non-sensitive tests. The proxy test fixture substitutes a documentation address and reserved example hostname for historical operational test values; production behavior is unchanged.

Excluded: proprietary Python scanner/AI orchestration/trading implementation, operational environment values, SSH/Vercel/hosting credentials, databases, snapshots, logs, local CA bundles, dependency directories and generated archives/build output.

This publication preserves the remote repository history and documentation. It grants no additional license or ownership rights beyond the repository's existing terms.
