import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import { uploadToR2, deleteFromR2, getR2Url } from "@/lib/r2";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 2 * 1024 * 1024;

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await checkUserAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = (formData.get("folder") as string) ?? "misc";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 2MB)" },
        { status: 400 }
      );
    }

    const ext = EXT_MAP[file.type] ?? "jpg";
    const r2Key = `pending/${folder}/${uuidv4()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(buffer, r2Key, file.type);

    const r2Url = getR2Url(r2Key);

    return NextResponse.json({
      r2Key,
      r2Url,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkUserAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { r2Key } = await req.json();
    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "r2Key required" }, { status: 400 });
    }

    await deleteFromR2(r2Key);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Upload DELETE error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}