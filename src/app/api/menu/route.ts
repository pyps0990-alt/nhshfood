import { NextRequest, NextResponse } from "next/server";
import { getMenuItems, addMenuItem } from "@/lib/db";

export async function GET(req: NextRequest) {
  const department = req.nextUrl.searchParams.get("department") || undefined;
  const includeAll = req.nextUrl.searchParams.get("all") === "true";

  const items = await getMenuItems(department, includeAll);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const id = await addMenuItem({
    name: body.name,
    price: body.price,
    category: body.category,
    department: body.department,
    description: body.description ?? null,
    imageUrl: body.imageUrl ?? null,
    available: true,
  });

  return NextResponse.json({ id, ...body }, { status: 201 });
}
