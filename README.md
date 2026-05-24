# allo-assignment
# Allo Inventory — Take-Home Exercise

A Next.js inventory reservation system built for Allo Health's engineering take-home exercise. Implements race-condition-safe unit reservations for multi-warehouse retail.

---

## Live Demo

**https://allo-assignment-five.vercel.app**

The database is seeded with 3 products across 2 warehouses. No setup required.

---

## How to run locally

### Prerequisites
- Node.js 18+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway)

### 1. Clone and install
```bash
git clone https://github.com/bhavyukthadacharla/allo-assignment.git
cd allo-assignment
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Fill in your `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

`DATABASE_URL` uses the connection pooler (for runtime queries).
`DIRECT_URL` uses a direct connection (for migrations).

### 3. Run migrations and generate Prisma client
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed the database
```bash
npx prisma db seed
```

This creates 3 products (iPhone 15 Pro, Samsung Galaxy S24, Sony WH-1000XM5) across 2 warehouses (Delhi and Mumbai) with 5 and 3 units respectively.

### 5. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses with inventory |
| POST | `/api/reservations` | Reserve units — returns 409 if not enough stock |
| GET | `/api/reservations/:id` | Get a single reservation |
| POST | `/api/reservations/:id/confirm` | Confirm reservation — returns 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |

---

## How concurrency is handled

**The problem:** Two simultaneous POST `/api/reservations` requests for the last unit of a SKU could both read `available = 1`, both pass the stock check, and both succeed — overselling the item.

**The fix: `SELECT ... FOR UPDATE`**

The reservation endpoint uses a raw SQL `SELECT ... FOR UPDATE` inside a Prisma `$transaction`. This acquires a row-level lock on the `Inventory` record before reading it. A second concurrent request blocks on the lock until the first transaction commits. When it unblocks, it re-reads the already-updated `reservedQuantity` and correctly returns a 409.

```sql
SELECT id, "totalQuantity", "reservedQuantity"
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

A Prisma-level transaction alone (without `FOR UPDATE`) does **not** prevent this — Postgres's default `READ COMMITTED` isolation allows two transactions to read the same row concurrently before either writes.

---

## How reservation expiry works

**Approach: lazy cleanup on read**

Reservations expire after 10 minutes (`expiresAt` timestamp). There is no background worker or cron job. Cleanup happens at the point of access:

- `POST /api/reservations/:id/confirm` — checks `expiresAt` before confirming. If expired, transitions status to `RELEASED`, decrements `reservedQuantity`, and returns 410.
- The checkout page runs a live countdown timer. When it reaches zero, it re-fetches the reservation and displays an "Expired" state automatically — no manual refresh needed.

**Trade-off:** Units held by expired-but-never-visited reservations stay reserved until someone touches that reservation. In production I would add a Vercel Cron job running every minute to bulk-release expired PENDING reservations:

```typescript
// vercel.json
{
  "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "* * * * *" }]
}
```

The lazy approach is correct for this scope but would cause visible stock suppression under real load.

---

## Data model

```prisma
model Inventory {
  totalQuantity    Int  // total physical units
  reservedQuantity Int  // units currently held by PENDING reservations
  // available = totalQuantity - reservedQuantity
}

model Reservation {
  status    ReservationStatus  // PENDING | CONFIRMED | RELEASED
  expiresAt DateTime
}
```

The distinction between `totalQuantity` and `reservedQuantity` is intentional:
- **Reserve** → increment `reservedQuantity`
- **Confirm** → decrement both `totalQuantity` and `reservedQuantity` (units are sold)
- **Release** → decrement only `reservedQuantity` (units return to available)

---

## Trade-offs and things I'd do differently

| Decision | Trade-off |
|---|---|
| Lazy expiry cleanup | Simple and correct, but held stock can linger. A cron job would fix this in production. |
| Raw SQL for `SELECT FOR UPDATE` | Prisma doesn't expose row locking natively — raw queries are less type-safe but necessary for correctness. |
| No authentication | Any client can confirm or release any reservation by ID. Production would scope reservations to a user session. |
| Single-unit reserve only | The UI always reserves 1 unit. The API supports arbitrary quantities — a quantity selector would be a small addition. |
| No idempotency keys | Retrying a failed POST `/api/reservations` could create a duplicate reservation. Implementing `Idempotency-Key` header support (storing results in Redis or a Postgres table) would fix this. |

---

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma** (ORM)
- **Supabase** (hosted PostgreSQL)
- **Zod** (request validation)
- **react-hot-toast** (error/success notifications)
- **Vercel** (deployment)