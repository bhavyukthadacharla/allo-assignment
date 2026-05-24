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
    else { setReservation(data); toast.success("Purchase confirmed! 🎉"); }
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
