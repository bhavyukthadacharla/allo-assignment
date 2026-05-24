"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import toast, { Toaster } from "react-hot-toast";

type Reservation = {
  id: string; productId: string; warehouseId: string; quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED"; expiresAt: string; createdAt: string;
  product: { name: string; price: number };
  warehouse: { name: string; location: string };
};

export default function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"confirm" | "cancel" | null>(null);

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setReservation(data);
    setSecondsLeft(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
    setLoading(false);
  }, [id]);

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
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (res.status === 410) { toast.error("Reservation expired — units released."); setReservation(r => r ? { ...r, status: "RELEASED" } : r); }
    else if (!res.ok) { toast.error(data.error ?? "Could not confirm."); }
    else { setReservation(data); toast.success("Purchase confirmed!"); }
    setActing(null);
  };

  const handleCancel = async () => {
    setActing("cancel");
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!reservation) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--bg)" }}>
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="1.5" style={{ display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
      <p style={{ color: "var(--text-2)", fontSize: 15 }}>Reservation not found.</p>
      <button onClick={() => router.push("/")} style={ghostBtn}>← Back to products</button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", fontFamily: "'Inter', sans-serif", fontSize: 14, boxShadow: "0 4px 6px rgba(0,0,0,0.07)" },
      }} />

      <nav style={{ background: "#fff", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.2px" }}>Allo Inventory</span>
          </div>
          <button onClick={() => router.push("/")} style={ghostBtn}>← Products</button>
        </div>
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.3px", marginBottom: 4 }}>Reservation</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>{reservation.id}</p>
        </div>

        {reservation.status === "CONFIRMED" && (
          <div style={{ ...bannerBase, background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)", marginBottom: 20 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Purchase confirmed — thank you!
          </div>
        )}
        {(reservation.status === "RELEASED" || (isExpired && reservation.status === "PENDING")) && (
          <div style={{ ...bannerBase, background: "var(--red-dim)", border: "1px solid var(--red-border)", color: "var(--red)", marginBottom: 20 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            {isExpired && reservation.status === "PENDING" ? "Reservation expired — units returned to stock." : "Reservation cancelled."}
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
          {isPending && (
            <div style={{ padding: "28px 28px 24px", borderBottom: "1px solid var(--border-subtle)", background: secondsLeft < 60 ? "#fef2f2" : secondsLeft < 120 ? "#fffbeb" : "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>Time remaining</span>
                <span style={{ fontSize: 12, color: secondsLeft < 60 ? "var(--red)" : secondsLeft < 120 ? "var(--amber)" : "var(--text-2)" }}>
                  {secondsLeft < 60 ? "Expiring soon!" : secondsLeft < 120 ? "Almost expired" : "Hold active"}
                </span>
              </div>
              <div style={{ fontSize: 52, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 4, color: secondsLeft < 60 ? "var(--red)" : secondsLeft < 120 ? "var(--amber)" : "var(--text)", lineHeight: 1, marginBottom: 16 }}>
                {fmt(secondsLeft)}
              </div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: secondsLeft < 60 ? "var(--red)" : secondsLeft < 120 ? "var(--amber)" : "var(--accent)", transition: "width 1s linear, background 0.5s" }} />
              </div>
            </div>
          )}

          <div style={{ padding: "20px 28px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {([
                  ["Product", reservation.product.name],
                  ["Warehouse", `${reservation.warehouse.name} · ${reservation.warehouse.location}`],
                  ["Quantity", `${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`],
                  ["Unit price", `₹${reservation.product.price.toLocaleString("en-IN")}`],
                  ["Total", `₹${(reservation.product.price * reservation.quantity).toLocaleString("en-IN")}`],
                  ["Expires at", new Date(reservation.expiresAt).toLocaleTimeString()],
                ] as [string, string][]).map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "11px 0", fontSize: 13, color: "var(--text-3)", width: "40%" }}>{label}</td>
                    <td style={{ padding: "11px 0", fontSize: 14, fontWeight: 500, color: "var(--text)", textAlign: "right" }}>{value}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "11px 0", fontSize: 13, color: "var(--text-3)" }}>Status</td>
                  <td style={{ padding: "11px 0", textAlign: "right" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: reservation.status === "CONFIRMED" ? "var(--green-dim)" : reservation.status === "RELEASED" ? "var(--red-dim)" : isPending ? "var(--accent-dim)" : "var(--amber-dim)",
                      color: reservation.status === "CONFIRMED" ? "var(--green)" : reservation.status === "RELEASED" ? "var(--red)" : isPending ? "var(--accent)" : "var(--amber)",
                      border: `1px solid ${reservation.status === "CONFIRMED" ? "var(--green-border)" : reservation.status === "RELEASED" ? "var(--red-border)" : isPending ? "rgba(29,78,216,0.2)" : "var(--amber-border)"}`,
                    }}>
                      {isExpired && reservation.status === "PENDING" ? "EXPIRED" : reservation.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {isPending && (
            <div style={{ padding: "16px 28px 24px", display: "flex", gap: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <button disabled={!!acting} onClick={handleConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-sm)", border: "none", background: acting ? "var(--accent-dim)" : "var(--accent)", color: acting ? "var(--accent)" : "#fff", fontSize: 14, fontWeight: 500, cursor: acting ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s", boxShadow: acting ? "none" : "var(--shadow-sm)" }}>
                {acting === "confirm" ? <><Spin color="var(--accent)" />Processing…</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>Confirm purchase</>}
              </button>
              <button disabled={!!acting} onClick={handleCancel} style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-sm)", background: "#fff", color: acting ? "var(--text-3)" : "var(--red)", border: `1px solid ${acting ? "var(--border)" : "var(--red-border)"}`, fontSize: 14, fontWeight: 500, cursor: acting ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
                {acting === "cancel" ? <><Spin color="var(--text-3)" />Cancelling…</> : "Cancel reservation"}
              </button>
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const Spin = ({ color }: { color: string }) => (
  <span style={{ width: 13, height: 13, border: `2px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
);
const bannerBase: React.CSSProperties = { padding: "12px 16px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 };
const ghostBtn: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 13, fontWeight: 500, padding: "6px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif" };
