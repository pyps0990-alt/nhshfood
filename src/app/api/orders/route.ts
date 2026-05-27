import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOrderSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
  department: z.enum(["breakfast", "lunch"]),
  note: z.string().nullable().optional(),
  pickupTime: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.number(),
        quantity: z.number().min(1),
        price: z.number(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const totalPrice = data.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      studentId: data.studentId,
      studentName: data.studentName ?? null,
      className: data.className ?? null,
      department: data.department,
      note: data.note ?? null,
      pickupTime: data.pickupTime ?? null,
      totalPrice,
      items: {
        create: data.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          price: i.price,
        })),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: NextRequest) {
  const department = req.nextUrl.searchParams.get("department");
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (department) where.department = department;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}
