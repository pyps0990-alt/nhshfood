import { NextRequest, NextResponse } from "next/server";
import { createOrder, getOrders } from "@/lib/db";
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
        menuItemId: z.string(),
        name: z.string(),
        quantity: z.number().min(1),
        price: z.number(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const totalPrice = data.items.reduce((s, i) => s + i.price * i.quantity, 0);

    const result = await createOrder({
      studentId: data.studentId,
      studentName: data.studentName ?? null,
      className: data.className ?? null,
      department: data.department,
      note: data.note ?? null,
      pickupTime: data.pickupTime ?? null,
      totalPrice,
      status: "pending",
      items: data.items,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get("department") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;

    const orders = await getOrders(department, status);
    return NextResponse.json(orders);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
