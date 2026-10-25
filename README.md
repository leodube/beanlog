<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="B{ean}log logo: a coffee bean whose crease is a curly brace">
</p>

<h1 align="center">B{ean}log</h1>

A self-hosted log for pour-over and immersion coffee. Record each brew, keep
your recipes in one place, and see what's working as you dial in a new bag.
Built mobile-first, so logging a brew from your phone at the kettle is as easy
as reviewing your stats on a laptop.

## Stack

[React Router](https://reactrouter.com) v8 in framework mode (server-rendered
React, loaders and actions), TypeScript, PostgreSQL via
[Drizzle ORM](https://orm.drizzle.team), Tailwind CSS v4 and Zod. Charts are
plain SVG. Passwords are hashed with argon2id.

## Running locally

You need **Node.js 24+** and **PostgreSQL** (14 or newer; developed against 18).

1. Install dependencies:

   ```sh
   git clone https://github.com/leodube/beanlog.git
   cd beanlog
   npm install
   ```

2. Create a database. With a local Postgres:

   ```sh
   createuser --pwprompt beanlog        # choose a password
   createdb --owner beanlog beanlog
   ```

   Or start a throwaway one in Docker:

   ```sh
   docker run -d --name beanlog-postgres -p 5432:5432 \
     -e POSTGRES_USER=beanlog -e POSTGRES_PASSWORD=beanlog -e POSTGRES_DB=beanlog \
     postgres:18
   ```

3. Configure the environment:

   ```sh
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your database and `SESSION_SECRET` to a random
   string (`openssl rand -base64 32`). The app and the scripts read `.env`
   automatically; variables already set in your shell take precedence.

4. Create the tables and your account:

   ```sh
   npm run db:migrate
   npm run user:create
   ```

5. Start the dev server and open <http://localhost:5173>:

   ```sh
   npm run dev
   ```

   <http://localhost:5173/healthz> should report `"db": "ok"`.

### Trying it on your phone

The dev server only listens on `localhost`. To open it from a phone on the
same network, run `npm run dev -- --host` and browse to
`http://<your-computer's-LAN-IP>:5173`. Anyone on that network can reach it
while it runs.

## Scripts

| Script                  | What it does                                               |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload on :5173                        |
| `npm run build`         | Production build into `build/`                             |
| `npm start`             | Run the production build (applies migrations first)        |
| `npm run typecheck`     | Generate route types and run `tsc`                         |
| `npm run format`        | Format with Prettier (also sorts Tailwind classes)         |
| `npm run db:generate`   | Turn changes in `app/db/schema.server.ts` into a migration |
| `npm run db:migrate`    | Apply pending migrations                                   |
| `npm run db:studio`     | Browse the database in Drizzle Studio                      |
| `npm run user:create`   | Create a login account                                     |
| `npm run user:password` | Set a new password and log out every device                |

## Project layout

```
app/
  root.tsx               document shell and mobile meta tags
  routes.ts              route table
  routes/                one module per page: loader, action and component
  components/            shared UI
  lib/                   domain logic and validation (*.server.ts stays on the server)
  lib/auth/              sessions, password hashing, rate limiting
  db/schema.server.ts    Drizzle tables
drizzle/                 SQL migrations (committed)
scripts/                 account scripts (user:create, user:password)
server.js                production server
```

A few conventions:

- Files ending in `.server.ts` are never bundled for the browser.
- Data is loaded and saved by route loaders and actions; there's no separate
  API. Sheets, filters and stats selections keep their state in the URL, so
  Back, reloads and shared links behave.
- To change the schema: edit `app/db/schema.server.ts`, run
  `npm run db:generate`, review the SQL in `drizzle/`, commit it, then
  `npm run db:migrate`.

## Dev containers

The repo includes a [Dev Container](https://containers.dev) setup
(`.devcontainer/devcontainer.json`) that keeps Node and dependencies off your
machine. It assumes:

- a Docker network called `devnet`, with a Postgres container named `postgres`
  on it (create the `beanlog` database there);
- a `.env` in the repo root. The container is started with `--env-file`, and
  `.env.example` is copied to `.env` on first open if it doesn't exist.

Inside the container, use `postgres` as the host in `DATABASE_URL`, e.g.
`postgres://dev:PASSWORD@postgres:5432/beanlog`. `node_modules` lives in a
Docker volume rather than the bind mount, which keeps installs fast on macOS.
After editing `.env`, rebuild the container so the new values are picked up.

If your Postgres lives somewhere else, change the `--network` entry in
`runArgs` and point `DATABASE_URL` at it.

## Self-hosting

Every push to `main` publishes a container image:

```
ghcr.io/leodube/beanlog:latest      # newest build of main
ghcr.io/leodube/beanlog:sha-abc1234 # a specific commit, for pinning or rollback
```

Version tags (`v1.2.0`) also publish `:1.2.0` and `:1.2`.

The container serves HTTP on port 3000 and applies pending database migrations
when it starts. It needs a PostgreSQL database and these variables:

| Variable           | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`     | yes      | `postgres://user:password@host:5432/beanlog`                                |
| `SESSION_SECRET`   | yes      | At least 32 random characters. Changing it logs everyone out.               |
| `TZ`               | no       | Time zone for dates and "today", e.g. `America/Vancouver`. Defaults to UTC. |
| `PORT`             | no       | Port to listen on (default `3000`)                                          |
| `TRUST_PROXY`      | no       | Number of reverse proxies in front of the app (default `1`; `0` if none)    |
| `MIGRATE_ON_START` | no       | Set to `false` to skip migrations at startup                                |

A minimal Docker Compose setup:

```yaml
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_USER: beanlog
      POSTGRES_PASSWORD: change-me
      POSTGRES_DB: beanlog
    volumes:
      - db:/var/lib/postgresql
    restart: unless-stopped

  app:
    image: ghcr.io/leodube/beanlog:latest
    environment:
      DATABASE_URL: postgres://beanlog:change-me@db:5432/beanlog
      SESSION_SECRET: change-me-to-32-or-more-random-characters
      TZ: America/Vancouver
    ports:
      - 127.0.0.1:3000:3000
    depends_on: [db]
    restart: unless-stopped

volumes:
  db:
```

Then create your account inside the running container:

```sh
docker compose exec app node build/cli/user-create.js
docker compose exec app node build/cli/user-password.js   # later, to reset a password
```

### Behind a reverse proxy

Run it behind a proxy that terminates HTTPS (Caddy, nginx, Traefik…). The
session cookie is marked `Secure`, so **logging in only works over HTTPS** in
production. The proxy must pass the original `Host` and set
`X-Forwarded-Proto` and `X-Forwarded-For`; Caddy does this by default:

```
beanlog.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

`X-Forwarded-For` is used to rate-limit failed logins per client, so make sure
the app is only reachable through the proxy, not directly.

### Health check and backups

`GET /healthz` returns 200 when the app can reach the database, and the image
has a built-in health check that uses it.

All data is in Postgres. Back it up with `pg_dump` rather than by copying the
data folder of a running database, for example:

```sh
docker compose exec db pg_dump -U beanlog -Fc beanlog > beanlog.dump
```

### Building the image yourself

```sh
docker build -t beanlog .
```

The build runs on GitHub Actions (`.github/workflows/publish.yml`): it checks
formatting and types, builds the app, then builds and pushes the image to the
GitHub Container Registry.
