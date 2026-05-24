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
