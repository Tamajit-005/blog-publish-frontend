import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { getCachedJwt, setCachedJwt } from "@/lib/strapiJwtCache";
import { bulkDeleteFromR2 } from "@/lib/r2";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");

async function loginOrRegister(user: any): Promise<string> {
  const cached = getCachedJwt(user.email);
  if (cached) return cached;

  let password = user.strapi?.password;
  if (!password) password = crypto.randomBytes(24).toString("hex");

  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });
  if (res.ok) {
    const data = await res.json();
    setCachedJwt(user.email, data.jwt);
    return data.jwt;
  }

  if (user.strapi?.password) throw new Error("Stored Strapi credentials are invalid");

  res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, username: user.username, password }),
  });
  if (!res.ok) throw new Error(`Strapi register failed: ${await res.text()}`);

  const data = await res.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  setCachedJwt(user.email, data.jwt);
  return data.jwt;
}

async function lookupIdsByUrls(fileUrls: string[], jwt: string): Promise<number[]> {
  if (fileUrls.length === 0) return [];

  const hashMap = new Map<string, string>();
  for (const fileUrl of fileUrls) {
    try {
      const fullFilename = new URL(fileUrl).pathname.split("/").pop();
      if (!fullFilename) continue;
      hashMap.set(fullFilename.replace(/\.[^/.]+$/, ""), fullFilename);
    } catch {
      console.warn(`Skipping invalid URL: ${fileUrl}`);
    }
  }
  if (hashMap.size === 0) return [];

  const hashParams = Array.from(hashMap.keys())
    .map((h, i) => `filters[hash][$in][${i}]=${encodeURIComponent(h)}`)
    .join("&");

  const res = await fetch(`${STRAPI_URL}/api/upload/files?${hashParams}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    console.warn("Batch hash lookup failed:", res.statusText);
    return [];
  }

  const files = await res.json();
  return Array.isArray(files) ? files.map((f: any) => f.id) : [];
}

async function lookupIdsByNames(filenames: string[], jwt: string): Promise<number[]> {
  if (filenames.length === 0) return [];

  const nameParams = filenames
    .map((n, i) => `filters[name][$in][${i}]=${encodeURIComponent(n)}`)
    .join("&");

  const res = await fetch(`${STRAPI_URL}/api/upload/files?${nameParams}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    console.warn("Batch name lookup failed:", res.statusText);
    return [];
  }

  const files = await res.json();
  return Array.isArray(files) ? files.map((f: any) => f.id) : [];
}

async function bulkDeleteStrapiFiles(ids: number[], jwt: string): Promise<void> {
  if (ids.length === 0) return;

  const res = await fetch(`${STRAPI_URL}/api/media/bulk-delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    console.warn("Bulk delete failed:", await res.text());
  } else {
    console.log(`🗑️ Bulk deleted Strapi file ids: [${ids.join(", ")}]`);
  }
}

function filenameFromBase64(base64?: string, fallback = "image"): string {
  if (!base64) return `${fallback}.png`;
  const nameMatch = base64.match(/name=([^;]+);base64,/);
  if (nameMatch?.[1]) {
    try {
      return decodeURIComponent(nameMatch[1]);
    } catch {
      return nameMatch[1];
    }
  }
  const mimeMatch = base64.match(/^data:(image\/[^;]+);base64,/);
  const mime = mimeMatch?.[1] || "image/png";
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return `${fallback}.${extMap[mime] ?? "png"}`;
}

function collectR2Keys(blog: any): string[] {
  return Array.from(
    new Set([
      ...(blog.r2CoverKey ? [blog.r2CoverKey] : []),
      ...((blog.inlineImages ?? []).map((img: any) => img.r2Key).filter(Boolean)),
      ...(blog.pendingEdit?.r2CoverKey ? [blog.pendingEdit.r2CoverKey] : []),
      ...((blog.pendingEdit?.inlineImages ?? []).map((img: any) => img.r2Key).filter(Boolean)),
    ])
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });

    const { blogId } = await req.json();
    if (!blogId)
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog)
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");
    if (!user)
      return NextResponse.json({ error: "Author not found" }, { status: 404 });

    const jwt = await loginOrRegister(user);
    const r2KeysToDelete = collectR2Keys(blog);

    const strapiDocId = blog.strapiId;
    if (!strapiDocId) {
      console.warn("⚠️ No strapiId — skipping Strapi deletion, cleaning MongoDB + R2 only.");
      await Blog.findByIdAndDelete(blogId);
      if (r2KeysToDelete.length > 0) {
        bulkDeleteFromR2(r2KeysToDelete).catch((err) =>
          console.error("R2 cleanup failed during approve-delete:", err)
        );
      }
      return NextResponse.json({ message: "Blog deleted (not in Strapi)" });
    }

    // STEP 1 — Delete the blog entry from Strapi
    const deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!deleteRes.ok) {
      const errData = await deleteRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Strapi deletion blocked: ${errData?.error?.message || deleteRes.statusText}` },
        { status: deleteRes.status }
      );
    }
    console.log("Strapi blog deleted:", strapiDocId);

    // STEP 2 — Collect Strapi media URLs and legacy filenames
    const urlsToDelete: string[] = [];
    const legacyFilenames: string[] = [];

    if (blog.strapiCoverUrl) {
      urlsToDelete.push(blog.strapiCoverUrl);
    } else {
      console.warn("⚠️ No strapiCoverUrl — cover not deleted from Strapi.");
    }

    for (const img of blog.inlineImages ?? []) {
      if (img.strapiUrl) {
        urlsToDelete.push(img.strapiUrl);
      } else {
        const filename = filenameFromBase64((img as any).base64, img.id);
        if (filename) legacyFilenames.push(filename);
      }
    }

    // STEP 3 — Lookup Strapi media IDs in parallel
    const [urlIds, nameIds] = await Promise.all([
      lookupIdsByUrls(urlsToDelete, jwt),
      lookupIdsByNames(legacyFilenames, jwt),
    ]);

    // STEP 4 — Bulk delete Strapi media (deduplicated)
    await bulkDeleteStrapiFiles([...new Set([...urlIds, ...nameIds])], jwt);

    // STEP 5 — Delete MongoDB doc
    await Blog.findByIdAndDelete(blogId);

    // STEP 6 — Fire-and-forget R2 cleanup (live + pendingEdit assets)
    if (r2KeysToDelete.length > 0) {
      bulkDeleteFromR2(r2KeysToDelete).catch((err) =>
        console.error("R2 cleanup failed during approve-delete:", err)
      );
    }

    return NextResponse.json({ message: "Blog permanently deleted" });
  } catch (error: any) {
    console.error("❌ Error approving delete:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}