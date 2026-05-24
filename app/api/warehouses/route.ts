import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    include: { inventories: { include: { product: true } } },
  });
  return NextResponse.json(warehouses);
}
