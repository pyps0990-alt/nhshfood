import { NextRequest, NextResponse } from "next/server";
import { updateMenuItem } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  await updateMenuItem(id, body);
  return NextResponse.json({ id, ...body });
}
