# Dependency security

Verified on 12 November 2026 (Africa/Kampala) with Node 24.12.0. The Vercel runtime is constrained
to Node `24.x`; Vercel supports this LTS line and manages its patch updates.
All direct dependency versions are exact and the npm lockfile is committed.

| Component | Previous | Current |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.2.6 | 16.4.6 |
| PostCSS | 8.5.8 | 8.5.32 |
| drizzle-kit | 0.31.10 | 0.31.11 |
| Legacy loader's esbuild | 0.18.20 | 0.25.12 |
| Affected transitive minimatch | 10.2.6 | 11.0.8 |

Version-scoped overrides replace the vulnerable esbuild/minimatch branches;
PostCSS resolves consistently to the direct patched version. The older
minimatch 3 line and tsx's newer esbuild are retained. The overridden loader was
verified by generating SQL for all 88 tables into ignored local files, without
connecting to or changing a database.

The shadcn generator/CSS package is a development dependency. The application
imports its CSS at build time, and imports no shadcn generator JavaScript.
Builds require development dependencies; the deployed Next.js output includes
the application runtime.

## Remaining upstream advisory

`npm audit --omit=dev` reports **zero production vulnerabilities**. The complete
development tree still reports **three low-severity findings**, all from the
same unpatched `deepmerge` advisory propagated through `@shadcn/registry` and
`shadcn`. Upstream lists no patched version. Downgrading shadcn to 1.0.0 would
remove the current CSS integration and is not a compatible remediation.

This is a tracked development-tool limitation, not a clean full audit. Avoid
processing untrusted registry definitions with the generator; the normal
application build imports static CSS and does not invoke the affected merge
code. Revisit this advisory when upstream publishes a compatible fix. No audit
finding is suppressed in npm configuration.

## Repeatable checks

```text
npm ci
npm run test:security
npm run test:migrations
npm run lint
npm run build
npm audit --omit=dev
npm audit
```

The security suite requires the seeded, project-local PostgreSQL database.
It explicitly rejects remote database fixture writes. Browser checks also use
temporary local accounts; real email delivery is tested only with explicit
recipient authorization and working provider configuration.

References: [Next.js November security release](https://nextjs.org/blog/november-2026-security-release),
[Next.js 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6),
[unpatched deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4),
[Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
