import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { OrderError } from "@/lib/orders";
import { createOrderPayment, createTopUpPayment } from "@/lib/payments/service";

const schema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("order"), orderId: z.string().regex(/^[A-Za-z0-9]{10,30}$/) }),
  z.object({ purpose: z.literal("top_up"), amount: z.number().int() }),
]);

/** Start (or retry) an ECPay payment. Returns the URL that hands off to ECPay. */
export async function POST(req: NextRequest) {
  const s = await requireStudent();
  if (s instanceof NextResponse) return s;
  if (!rateLimit(`pay-start:${s.studentId}`, 10, 5 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "操作太頻繁，請稍後再試" }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "參數錯誤" }, { status: 400 });

  try {
    const mtn =
      parsed.data.purpose === "order"
        ? await createOrderPayment(parsed.data.orderId, s.studentId)
        : await createTopUpPayment(s.studentId, parsed.data.amount);
    return NextResponse.json({ redirectUrl: `/api/payments/ecpay/redirect/${mtn}`, merchantTradeNo: mtn });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ecpay start error:", err);
    return NextResponse.json({ error: "無法建立付款" }, { status: 500 });
  }
}
