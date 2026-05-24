#!/bin/bash
set -e

echo "🚀 Setting up Allo Assignment..."

# ── Folder structure ──────────────────────────────────────────────────────────
mkdir -p app/api/products
mkdir -p app/api/warehouses
mkdir -p "app/api/reservations/[id]/confirm"
mkdir -p "app/api/reservations/[id]/release"
mkdir -p "app/reservation/[id]"
mkdir -p lib
mkdir -p prisma

# ── package.json ──────────────────────────────────────────────────────────────
cat > package.json << 'EOF'
{
  "name": "allo-assignment",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "react-hot-toast": "^2.4.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "prisma": "^5.0.0",
    "tsx": "^4.16.2",
    "typescript": "^5.0.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
EOF

# ── tsconfig.json ─────────────────────────────────────────────────────────────
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# ── next.config.js ────────────────────────────────────────────────────────────
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
EOF

# ── .gitignore ────────────────────────────────────────────────────────────────
cat > .gitignore << 'EOF'
node_modules/
.next/
.env
*.env.local
EOF

# ── .env.example ─────────────────────────────────────────────────────────────
cat > .env.example << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
EOF

# ── lib/prisma.ts ─────────────────────────────────────────────────────────────
cat > lib/prisma.ts << 'EOF'
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma;
EOF

# ── prisma/schema.prisma ──────────────────────────────────────────────────────
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id           String        @id @default(cuid())
  name         String
  price        Float
  inventories  Inventory[]
  reservations Reservation[]
}

model Warehouse {
  id           String        @id @default(cuid())
  name         String
  location     String
  inventories  Inventory[]
  reservations Reservation[]
}

model Inventory {
  id               String @id @default(cuid())
  productId        String
  warehouseId      String
  totalQuantity    Int
  reservedQuantity Int    @default(0)

  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([productId, warehouseId])
}

model Reservation {
  id          String            @id @default(cuid())
  productId   String
  warehouseId String
  quantity    Int
  status      ReservationStatus
  expiresAt   DateTime
  createdAt   DateTime          @default(now())

  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  RELEASED
}
EOF

# ── prisma/seed.ts ────────────────────────────────────────────────────────────
cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const warehouseA = await prisma.warehouse.create({
    data: { name: "Warehouse Delhi", location: "New Delhi" },
  });
  const warehouseB = await prisma.warehouse.create({
    data: { name: "Warehouse Mumbai", location: "Mumbai" },
  });

  const products = [
    { name: "iPhone 15 Pro", price: 134900 },
    { name: "Samsung Galaxy S24", price: 79999 },
    { name: "Sony WH-1000XM5", price: 26990 },
  ];

  for (const p of products) {
    const product = await prisma.product.create({ data: p });
    await prisma.inventory.createMany({
      data: [
        { productId: product.id, warehouseId: warehouseA.id, totalQuantity: 5 },
        { productId: product.id, warehouseId: warehouseB.id, totalQuantity: 3 },
      ],
    });
  }

  console.log("✅ Seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
EOF

# ── app/globals.css ───────────────────────────────────────────────────────────
cat > app/globals.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --surface-2: #1a1a24;
  --border: #2a2a38;
  --border-subtle: #1e1e2a;
  --accent: #6c63ff;
  --accent-dim: rgba(108, 99, 255, 0.15);
  --accent-glow: rgba(108, 99, 255, 0.3);
  --green: #22c55e;
  --green-dim: rgba(34, 197, 94, 0.12);
  --red: #ef4444;
  --red-dim: rgba(239, 68, 68, 0.12);
  --amber: #f59e0b;
  --amber-dim: rgba(245, 158, 11, 0.12);
  --text: #f0f0f8;
  --text-2: #9090a8;
  --text-3: #505068;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}
#__next, main { position: relative; z-index: 1; }
EOF

# ── app/layout.tsx ────────────────────────────────────────────────────────────
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Inventory reservation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

# ── app/page.tsx ──────────────────────────────────────────────────────────────
cat > app/page.tsx << 'PAGEOF'
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Inventory = {
  id: string;
  warehouseId: string;
  totalQuantity: number;
  reservedQuantity: number;
  warehouse: { id: string; name: string; location: string };
};
type Product = {
  id: string;
  name: string;
  price: number;
  inventories: Inventory[];
};

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts).finally(() => setLoading(false));
  }, []);

  const handleReserve = async (productId: string, warehouseId: string) => {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.status === 409) { toast.error("Not enough stock available."); return; }
      if (!res.ok) { toast.error(data.error ?? "Something went wrong."); return; }
      router.push(`/reservation/${data.id}`);
    } finally {
      setReserving(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "0 20px" }}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#1a1a24", color: "#f0f0f8", border: "1px solid #2a2a38", fontFamily: "'DM Sans', sans-serif" } }} />
      <header style={{ maxWidth: 900, margin: "0 auto", padding: "32px 0 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>Allo Inventory</span>
        </div>
        <span style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "'DM Mono', monospace" }}>reserve · confirm · done</span>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 600, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 14 }}>
            Available <span style={{ color: "var(--accent)" }}>Products</span>
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 16, fontWeight: 300 }}>Reserve units instantly. Your hold expires in 10 minutes.</p>
        </div>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 140, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", opacity: 0.5 }} />)}
          </div>
        )}
        {!loading && products.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-3)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p>No products found. Run the seed script.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {products.map((product, pi) => (
            <div key={product.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", animation: `fadeUp 0.4s ease both`, animationDelay: `${pi * 80}ms` }}>
              <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px", marginBottom: 4 }}>{product.name}</h2>
                  <span style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "'DM Mono', monospace" }}>ID: {product.id.slice(0,8)}…</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--accent)", letterSpacing: "-0.5px" }}>₹{product.price.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>per unit</div>
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                {product.inventories.map((inv) => {
                  const available = inv.totalQuantity - inv.reservedQuantity;
                  const key = `${product.id}-${inv.warehouseId}`;
                  const isReserving = reserving === key;
                  return (
                    <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid var(--border-subtle)", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                        <div style={{ width: 40, height: 40, background: "var(--surface-2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏭</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 15 }}>{inv.warehouse.name}</div>
                          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>📍 {inv.warehouse.location}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, background: available > 3 ? "var(--green-dim)" : available > 0 ? "var(--amber-dim)" : "var(--red-dim)", color: available > 3 ? "var(--green)" : available > 0 ? "var(--amber)" : "var(--red)" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                            {available > 0 ? `${available} in stock` : "Out of stock"}
                          </div>
                          {inv.reservedQuantity > 0 && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, textAlign: "right" }}>{inv.reservedQuantity} reserved</div>}
                        </div>
                        <button
                          disabled={available === 0 || isReserving}
                          onClick={() => handleReserve(product.id, inv.warehouseId)}
                          style={{ padding: "10px 22px", borderRadius: "var(--radius-sm)", border: "none", background: available === 0 ? "var(--surface-2)" : isReserving ? "var(--accent-dim)" : "var(--accent)", color: available === 0 ? "var(--text-3)" : "white", fontSize: 14, fontWeight: 500, cursor: available === 0 || isReserving ? "not-allowed" : "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif", minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          {isReserving ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Holding…</> : available === 0 ? "Unavailable" : "Reserve →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
PAGEOF

# ── app/reservation/[id]/page.tsx ─────────────────────────────────────────────
cat > "app/reservation/[id]/page.tsx" << 'RESOF'
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Reservation = {
  id: string; productId: string; warehouseId: string; quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED"; expiresAt: string; createdAt: string;
  product: { name: string; price: number };
  warehouse: { name: string; location: string };
};

export default function ReservationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"confirm" | "cancel" | null>(null);

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${params.id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setReservation(data);
    setSecondsLeft(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING" || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft(s => { if (s <= 1) { clearInterval(t); fetchReservation(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [reservation, secondsLeft, fetchReservation]);

  const handleConfirm = async () => {
    setActing("confirm");
    const res = await fetch(`/api/reservations/${params.id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (res.status === 410) { toast.error("Reservation expired — units released."); setReservation(r => r ? { ...r, status: "RELEASED" } : r); }
    else if (!res.ok) { toast.error(data.error ?? "Could not confirm."); }
    else { setReservation(data); toast.success("Purchase confirmed! 🎉"); }
    setActing(null);
  };

  const handleCancel = async () => {
    setActing("cancel");
    const res = await fetch(`/api/reservations/${params.id}/release`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not cancel."); }
    else { setReservation(data); toast.success("Reservation cancelled."); }
    setActing(null);
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const pct = Math.min(100, (secondsLeft / 600) * 100);
  const isExpired = reservation ? new Date() > new Date(reservation.expiresAt) : false;
  const isPending = reservation?.status === "PENDING" && !isExpired;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!reservation) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <p style={{ color: "var(--text-2)" }}>Reservation not found.</p>
      <button onClick={() => router.push("/")} style={btn("ghost")}>← Back to products</button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "0 20px" }}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#1a1a24", color: "#f0f0f8", border: "1px solid #2a2a38", fontFamily: "'DM Sans', sans-serif" } }} />
      <header style={{ maxWidth: 640, margin: "0 auto", padding: "32px 0 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>Allo Inventory</span>
        </div>
        <button onClick={() => router.push("/")} style={btn("ghost")}>← Products</button>
      </header>
      <main style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>
        {reservation.status === "CONFIRMED" && (
          <div style={{ ...banner, background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--green)", marginBottom: 24 }}>✓ Purchase confirmed — thank you!</div>
        )}
        {(reservation.status === "RELEASED" || (isExpired && reservation.status === "PENDING")) && (
          <div style={{ ...banner, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", marginBottom: 24 }}>
            {isExpired && reservation.status === "PENDING" ? "⏱ Expired — units returned to stock." : "✕ Reservation cancelled."}
          </div>
        )}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", animation: "fadeUp 0.35s ease both" }}>
          {isPending && (
            <div style={{ padding: "32px 32px 28px", borderBottom: "1px solid var(--border-subtle)", textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>Time to complete payment</p>
              <div style={{ fontSize: 64, fontWeight: 600, fontFamily: "'DM Mono', monospace", letterSpacing: 2, color: secondsLeft < 60 ? "var(--red)" : secondsLeft < 120 ? "var(--amber)" : "var(--text)", lineHeight: 1, marginBottom: 20 }}>
                {fmt(secondsLeft)}
              </div>
              <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: secondsLeft < 60 ? "var(--red)" : secondsLeft < 120 ? "var(--amber)" : "var(--accent)", transition: "width 1s linear, background 0.3s" }} />
              </div>
            </div>
          )}
          <div style={{ padding: "24px 32px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px", marginBottom: 20 }}>Reservation Details</h2>
            {([
              ["Product", reservation.product.name, false],
              ["Warehouse", `${reservation.warehouse.name} · ${reservation.warehouse.location}`, false],
              ["Quantity", `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`, false],
              ["Total", `₹${(reservation.product.price * reservation.quantity).toLocaleString("en-IN")}`, false],
              ["Expires", new Date(reservation.expiresAt).toLocaleTimeString(), false],
              ["Reservation ID", reservation.id, true],
            ] as [string, string, boolean][]).map(([label, value, mono]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>{label}</span>
                <span style={{ fontSize: mono ? 12 : 14, fontWeight: 500, fontFamily: mono ? "'DM Mono', monospace" : undefined, color: mono ? "var(--text-2)" : "var(--text)" }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>Status</span>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: reservation.status === "CONFIRMED" ? "var(--green-dim)" : reservation.status === "RELEASED" ? "var(--red-dim)" : "var(--accent-dim)", color: reservation.status === "CONFIRMED" ? "var(--green)" : reservation.status === "RELEASED" ? "var(--red)" : "var(--accent)" }}>
                {isExpired && reservation.status === "PENDING" ? "EXPIRED" : reservation.status}
              </span>
            </div>
          </div>
          {isPending && (
            <div style={{ padding: "20px 32px 28px", display: "flex", gap: 12 }}>
              <button disabled={!!acting} onClick={handleConfirm} style={{ ...btn("primary"), flex: 1, opacity: acting ? 0.7 : 1 }}>
                {acting === "confirm" ? <><Spin />Processing…</> : "✓ Confirm purchase"}
              </button>
              <button disabled={!!acting} onClick={handleCancel} style={{ ...btn("danger"), flex: 1, opacity: acting ? 0.7 : 1 }}>
                {acting === "cancel" ? <><Spin />Cancelling…</> : "Cancel"}
              </button>
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const Spin = () => <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite", marginRight: 6 }} />;
const banner: React.CSSProperties = { padding: "14px 20px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, textAlign: "center" };
function btn(v: "primary"|"ghost"|"danger"): React.CSSProperties {
  const base: React.CSSProperties = { padding: "11px 22px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.15s" };
  if (v === "primary") return { ...base, background: "var(--accent)", color: "white" };
  if (v === "danger") return { ...base, background: "var(--surface-2)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)" };
  return { ...base, background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)" };
}
RESOF

# ── API routes ────────────────────────────────────────────────────────────────
cat > app/api/products/route.ts << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { inventories: { include: { warehouse: true } } },
  });
  return NextResponse.json(products);
}
EOF

cat > app/api/warehouses/route.ts << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    include: { inventories: { include: { product: true } } },
  });
  return NextResponse.json(warehouses);
}
EOF

cat > app/api/reservations/route.ts << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Schema = z.object({
  productId:   z.string().min(1),
  warehouseId: z.string().min(1),
  quantity:    z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId, warehouseId, quantity } = parsed.data;

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE — locks the row so concurrent requests
      // block here instead of both reading the same available count.
      const rows = await tx.$queryRaw<
        { id: string; totalQuantity: number; reservedQuantity: number }[]
      >`
        SELECT id, "totalQuantity", "reservedQuantity"
        FROM "Inventory"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (rows.length === 0) throw Object.assign(new Error("Inventory not found"), { status: 404 });

      const inv = rows[0];
      const available = inv.totalQuantity - inv.reservedQuantity;
      if (available < quantity) throw Object.assign(new Error("Not enough stock"), { status: 409 });

      await tx.$executeRaw`
        UPDATE "Inventory" SET "reservedQuantity" = "reservedQuantity" + ${quantity} WHERE id = ${inv.id}
      `;

      return await tx.reservation.create({
        data: { productId, warehouseId, quantity, status: "PENDING", expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: err?.status ?? 500 });
  }
}
EOF

cat > "app/api/reservations/[id]/route.ts" << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { product: true, warehouse: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(reservation);
}
EOF

cat > "app/api/reservations/[id]/confirm/route.ts" << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id: params.id } });
      if (!r) throw Object.assign(new Error("Not found"), { status: 404 });
      if (r.status !== "PENDING") throw Object.assign(new Error(`Already ${r.status.toLowerCase()}`), { status: 409 });
      if (new Date() > r.expiresAt) {
        await tx.inventory.updateMany({ where: { productId: r.productId, warehouseId: r.warehouseId }, data: { reservedQuantity: { decrement: r.quantity } } });
        await tx.reservation.update({ where: { id: params.id }, data: { status: "RELEASED" } });
        throw Object.assign(new Error("Reservation has expired"), { status: 410 });
      }
      await tx.inventory.updateMany({
        where: { productId: r.productId, warehouseId: r.warehouseId },
        data: { totalQuantity: { decrement: r.quantity }, reservedQuantity: { decrement: r.quantity } },
      });
      return await tx.reservation.update({ where: { id: params.id }, data: { status: "CONFIRMED" } });
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: err?.status ?? 500 });
  }
}
EOF

cat > "app/api/reservations/[id]/release/route.ts" << 'EOF'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id: params.id } });
      if (!r) throw Object.assign(new Error("Not found"), { status: 404 });
      if (r.status !== "PENDING") throw Object.assign(new Error(`Already ${r.status.toLowerCase()}`), { status: 409 });
      await tx.inventory.updateMany({ where: { productId: r.productId, warehouseId: r.warehouseId }, data: { reservedQuantity: { decrement: r.quantity } } });
      return await tx.reservation.update({ where: { id: params.id }, data: { status: "RELEASED" } });
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: err?.status ?? 500 });
  }
}
EOF

echo ""
echo "✅ All files created. Now run:"
echo ""
echo "  npm install"
echo ""
