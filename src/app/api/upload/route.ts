import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/security";

const MAX_BYTES = 5 * 1024 * 1024;

// Detect type from magic bytes — never trust the filename or client MIME.
function sniffImage(b: Buffer): { ext: string; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (b.length > 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString())) return { ext: "gif", mime: "image/gif" };
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "圖片不可超過 5MB" }, { status: 413 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇圖片" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "圖片不可超過 5MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buffer);
  if (!kind) {
    return NextResponse.json({ error: "僅支援 JPG、PNG、WebP、GIF" }, { status: 415 });
  }

  const name = `menu/${Date.now()}-${randomUUID().slice(0, 8)}.${kind.ext}`;
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  try {
    if (bucketName) {
      // Production: Firebase Storage with a download token (works with the
      // default Firebase Storage rules; no public bucket ACL needed).
      const { getStorage } = await import("firebase-admin/storage");
      const { adminApp } = await import("@/lib/firebase-admin");
      const token = randomUUID();
      await getStorage(adminApp).bucket(bucketName).file(name).save(buffer, {
        contentType: kind.mime,
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=31536000, immutable",
          metadata: { firebaseStorageDownloadTokens: token, uploadedBy: auth.username },
        },
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(name)}?alt=media&token=${token}`;
      await auditLog({ actor: auth.username, action: "upload.image", target: name });
      return NextResponse.json({ url });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "尚未設定 FIREBASE_STORAGE_BUCKET，無法上傳圖片" },
        { status: 503 }
      );
    }

    // Local dev / self-hosted fallback.
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const dir = path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(process.cwd(), "public", "uploads", name), buffer);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ error: "上傳失敗" }, { status: 500 });
  }
}
