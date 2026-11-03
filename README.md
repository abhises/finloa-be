# finloa-be

Finloa API — Express 5 + TypeScript + Prisma 7 + PostgreSQL (Docker).

## Setup

```bash
cp .env.example .env        # then set a real ADMIN_API_KEY (16+ chars)
npm install                 # also runs `prisma generate`
npm run db:up               # starts Postgres on localhost:5435
npm run db:migrate          # applies migrations
npm run db:seed             # seeds the 4 video plans and 8 blog posts
npm run dev                 # http://localhost:4000
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | API + DB status |
| GET | `/api/plans` | — | Active video plans |
| GET | `/api/plans/:slug` | — | One plan |
| POST | `/api/leads` | — | Contact form submission from any page; `source` = page slug (rate-limited, honeypot) |
| GET | `/api/leads?status=NEW&source=seo&page=1&pageSize=20` | `x-admin-key` | List leads |
| PATCH | `/api/leads/:id` | `x-admin-key` | Update lead `status` |
| GET | `/api/posts?topic=SEO` | — | Published blog posts |
| POST | `/api/subscribers` | — | Blog newsletter signup (idempotent, rate-limited) |
| GET | `/api/subscribers` | `x-admin-key` | List subscribers |

## Scripts

`db:studio` opens Prisma Studio, `db:down` stops Postgres, `build` / `start` for production.

## Deployment (AWS EC2 · GitHub Actions)

Pushing to `main` runs `.github/workflows/deploy.yml`:

1. Type-checks the code.
2. Builds the Docker image and pushes it to `ghcr.io/abhises/finloa-be` (`latest` + commit SHA).
3. Copies `deploy/docker-compose.prod.yml` and `deploy/Caddyfile` to `/opt/finloa` on the server.
4. SSHes in, pulls the image and restarts `db`, `backend` and `caddy`. On start the container runs
   `prisma migrate deploy`, upserts seed data, then starts the API, and the job waits for `/api/health`.

The `finloa-fe` repo has the same workflow for the frontend image.

**Server layout** (`ubuntu@13.51.72.210`):

```
/opt/finloa/
  .env                 # secrets: POSTGRES_*, ADMIN_API_KEY, CORS_ORIGINS (only on the server)
  docker-compose.yml   # copied from deploy/docker-compose.prod.yml on every backend deploy
  Caddyfile            # copied from deploy/Caddyfile
```

Caddy listens on port 80 and routes `/api/*` → backend:4000 and everything else → frontend:3000.

**GitHub secrets** needed in *both* repos (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `SSH_HOST` | `13.51.72.210` |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | private key whose public half is in the server's `~/.ssh/authorized_keys` |

**Useful commands on the server**

```bash
cd /opt/finloa
docker compose ps
docker compose logs -f backend
docker compose exec db psql -U finloa finloa
grep ADMIN_API_KEY .env          # admin key for GET /api/leads
```

**Adding a domain:** point an A record at the server, replace `:80` in `deploy/Caddyfile` with your domain,
add `https://yourdomain.com` to `CORS_ORIGINS` in `/opt/finloa/.env`, open port 443 in the security group,
and push. Caddy gets HTTPS certificates automatically.
