import { z } from "zod";
import { safeImageUrl } from "@/lib/security";

const text = (max: number) =>
  z.string().trim().max(max).transform((s) => s.replace(/[<>]/g, ""));

export const menuTagSchema = z.enum(["promotion", "seasonal", "daily_special"]);

export const menuCreateSchema = z.object({
  name: text(60).pipe(z.string().min(1, "請輸入品名")),
  price: z.number().int().min(0).max(10000),
  category: text(30).pipe(z.string().min(1, "請輸入分類")),
  department: z.enum(["breakfast", "lunch"]),
  description: text(200).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional()
    .transform((u) => (u ? safeImageUrl(u) : null)),
  tags: z.array(menuTagSchema).max(3).optional().default([]),
  stock: z.number().int().min(0).max(100000).nullable().optional().default(null),
});

export const menuUpdateSchema = z.object({
  name: text(60).pipe(z.string().min(1)).optional(),
  price: z.number().int().min(0).max(10000).optional(),
  category: text(30).pipe(z.string().min(1)).optional(),
  department: z.enum(["breakfast", "lunch"]).optional(),
  description: text(200).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional()
    .transform((u) => (u === undefined ? undefined : u ? safeImageUrl(u) : null)),
  available: z.boolean().optional(),
  tags: z.array(menuTagSchema).max(3).optional(),
  stock: z.number().int().min(0).max(100000).nullable().optional(),
  soldOut: z.boolean().optional(),
}).strict();
