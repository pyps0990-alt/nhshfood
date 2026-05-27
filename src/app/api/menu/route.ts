import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const department = req.nextUrl.searchParams.get("department");

  const where: Record<string, unknown> = { available: true };
  if (department) where.department = department;

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: { category: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const item = await prisma.menuItem.create({
    data: {
      name: body.name,
      price: body.price,
      category: body.category,
      department: body.department,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      availableFrom: body.availableFrom ?? null,
      availableTo: body.availableTo ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
