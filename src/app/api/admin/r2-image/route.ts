import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import { fetchFromR2 } from "@/lib/r2";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key query param required" }, { status: 400 });
    }

    // Security: only allow keys in the "pending/" prefix for admin preview
    if (!key.startsWith("pending/")) {
      return NextResponse.json({ error: "Invalid key" }, { status: 403 });
    }

    const { buffer, contentType: r2ContentType } = await fetchFromR2(key);

    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = CONTENT_TYPES[ext] ?? r2ContentType ?? "image/jpeg";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    console.error("r2-image proxy error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}