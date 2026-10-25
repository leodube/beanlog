# B{ean}log

Self-hosted coffee brew log. React Router (framework mode) + TypeScript,
Postgres via Drizzle, Tailwind. Built mobile-first.

## Prerequisites

- Docker Desktop and VS Code with the Dev Containers extension
- The dev Postgres instance and `devnet` network running
  (`~/repos/dotfiles/docker/dev-services`, `docker compose up -d`)
- A `beanlog` database in it:

  ```sh
  docker exec -it postgres psql -U dev -c "CREATE DATABASE beanlog;"
  ```

## First run

1. Open the repo in VS Code → **Reopen in Container**. On first start this
   copies `.env.example` to `.env`.
2. Edit `.env`: set the Postgres password in `DATABASE_URL`, and set
   `SESSION_SECRET` (`openssl rand -base64 32`). The server refuses to start
   until both are valid.
3. Rebuild the container (env files are read at container start), then:

   ```sh
   npm run dev
   ```

4. Open http://localhost:5173. http://localhost:5173/healthz should report
   `"db": "ok"`.

## Scripts

| Script                | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Dev server with HMR on :5173                   |
| `npm run typecheck`   | Generate route types, run `tsc`                |
| `npm run build`       | Production build into `build/`                 |
| `npm run format`      | Prettier (sorts Tailwind classes too)          |
| `npm run db:generate` | Diff `app/db/schema.server.ts` → SQL migration |
| `npm run db:migrate`  | Apply pending migrations in `drizzle/`         |
| `npm run db:studio`   | Drizzle Studio on :4983                        |

## Layout

```
app/
  root.tsx               document shell, mobile meta tags
  routes.ts              route table
  routes/                one module per page (loader + action + component)
  components/            shared UI
  lib/env.server.ts      validated environment
  db/schema.server.ts    Drizzle tables
  db/client.server.ts    DB connection
drizzle/                 generated SQL migrations (committed)
public/                  static files, web manifest
```

## Testing on the iPhone during development

The forwarded port is bound to the Mac's localhost only. To reach the dev
server from the phone on the same Wi-Fi, add `"-p", "5173:5173"` to
`runArgs` in `.devcontainer/devcontainer.json`, rebuild, and open
`http://<mac-lan-ip>:5173`. This exposes the dev server to your LAN while
it runs, so it's left off by default. Safari's responsive design mode on the
Mac covers most layout work without it.
