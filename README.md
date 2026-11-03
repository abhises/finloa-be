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
