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
