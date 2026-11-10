import { NextResponse } from "next/server";
import { getEcpayConfig } from "@/lib/payments/ecpay";
import { TOP_UP_MAX, TOP_UP_MIN } from "@/lib/payments/service";

// Public: lets the UI decide whether to show the online-payment option.
export async function GET() {
  const cfg = getEcpayConfig();
  return NextResponse.json(
    { enabled: !!cfg, mode: cfg?.mode ?? null, topUpMin: TOP_UP_MIN, topUpMax: TOP_UP_MAX },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
