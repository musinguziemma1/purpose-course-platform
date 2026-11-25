# Project collaboration instructions

The user has authorized committing and pushing project updates to GitHub as a
standing instruction. After completing updates and the relevant checks, commit
the changes and push the current branch to the configured `origin` remote,
unless the user explicitly says otherwise. Report the pushed commit or any
failure. Do not force-push or rewrite shared history.

Keep credentials, environment files, database snapshots, generated runtime
configuration, and local tool state out of commits. Preserve `.env.example`
as a placeholder-only template. Preserve unrelated work already in progress.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
