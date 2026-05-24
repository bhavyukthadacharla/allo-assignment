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
