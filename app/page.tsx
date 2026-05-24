"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Inventory = {
  id: string; warehouseId: string; totalQuantity: number; reservedQuantity: number;
  warehouse: { id: string; name: string; location: string };
};
type Product = { id: string; name: string; price: number; inventories: Inventory[]; };

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
    } finally { setReserving(null); }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", fontFamily: "'Inter', sans-serif", fontSize: 14, boxShadow: "0 4px 6px rgba(0,0,0,0.07)" },
        error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        success: { iconTheme: { primary: "#15803d", secondary: "#fff" } },
      }} />

      <nav style={{ background: "#fff", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.2px" }}>Allo Inventory</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>INVENTORY MANAGEMENT</span>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.4px", marginBottom: 6 }}>Product Inventory</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>Reserve units for purchase. Holds expire after 10 minutes.</p>
        </div>

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Total Products", value: products.length },
              { label: "Total Warehouses", value: [...new Set(products.flatMap(p => p.inventories.map(i => i.warehouseId)))].length },
              { label: "Units Available", value: products.reduce((acc, p) => acc + p.inventories.reduce((a, i) => a + (i.totalQuantity - i.reservedQuantity), 0), 0) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: "var(--accent)", letterSpacing: "-0.5px" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 120, background: "#fff", borderRadius: "var(--radius)", border: "1px solid var(--border)", opacity: 0.6 }} />)}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map((product) => (
            <div key={product.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{product.name}</h2>
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>{product.id.slice(0, 12)}…</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--accent)" }}>₹{product.price.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>per unit</div>
                </div>
              </div>
              {product.inventories.map((inv) => {
                const available = inv.totalQuantity - inv.reservedQuantity;
                const key = `${product.id}-${inv.warehouseId}`;
                const isReserving = reserving === key;
                const stockColor = available > 3 ? "var(--green)" : available > 0 ? "var(--amber)" : "var(--red)";
                const stockBg = available > 3 ? "var(--green-dim)" : available > 0 ? "var(--amber-dim)" : "var(--red-dim)";
                const stockBorder = available > 3 ? "var(--green-border)" : available > 0 ? "var(--amber-border)" : "var(--red-border)";
                return (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div style={{ width: 36, height: 36, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text)" }}>{inv.warehouse.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{inv.warehouse.location}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: stockBg, color: stockColor, border: `1px solid ${stockBorder}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                          {available > 0 ? `${available} in stock` : "Out of stock"}
                        </div>
                        {inv.reservedQuantity > 0 && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, textAlign: "right" }}>{inv.reservedQuantity} reserved</div>}
                      </div>
                      <button
                        disabled={available === 0 || isReserving}
                        onClick={() => handleReserve(product.id, inv.warehouseId)}
                        style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: available === 0 ? "var(--surface-2)" : isReserving ? "var(--accent-dim)" : "var(--accent)", color: available === 0 ? "var(--text-3)" : isReserving ? "var(--accent)" : "#fff", fontSize: 13, fontWeight: 500, cursor: available === 0 || isReserving ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", minWidth: 100, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s, color 0.15s", boxShadow: available === 0 || isReserving ? "none" : "var(--shadow-sm)" }}
                      >
                        {isReserving ? <><span style={{ width: 12, height: 12, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Reserving</> : available === 0 ? "Unavailable" : <>Reserve <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg></>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
