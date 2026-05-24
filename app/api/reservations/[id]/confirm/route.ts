import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id } });
      if (!r) throw Object.assign(new Error("Not found"), { status: 404 });
      if (r.status !== "PENDING") throw Object.assign(new Error(`Already ${r.status.toLowerCase()}`), { status: 409 });
      if (new Date() > r.expiresAt) {
        await tx.inventory.updateMany({ where: { productId: r.productId, warehouseId: r.warehouseId }, data: { reservedQuantity: { decrement: r.quantity } } });
        await tx.reservation.update({ where: { id }, data: { status: "RELEASED" } });
        throw Object.assign(new Error("Reservation has expired"), { status: 410 });
      }
      await tx.inventory.updateMany({
        where: { productId: r.productId, warehouseId: r.warehouseId },
        data: { totalQuantity: { decrement: r.quantity }, reservedQuantity: { decrement: r.quantity } },
      });
      return await tx.reservation.update({ where: { id }, data: { status: "CONFIRMED" }, include: { product: true, warehouse: true } });
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: err?.status ?? 500 });
  }
}
