import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { bulkDeleteFromR2 } from "@/lib/r2";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN!;

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

async function adminDeleteStrapiFiles(ids: number[], jwt: string): Promise<void> {
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
    console.warn(`Strapi bulk media delete failed: ${await res.text()}`);
  } else {
    console.log(`🗑️ Bulk deleted Strapi media ids: [${ids.join(", ")}]`);
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

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );

    const { blogId } = await req.json();
    if (!blogId)
      return NextResponse.json({ error: "Blog ID required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog)
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    const jwt = STRAPI_API_TOKEN;
    const r2Keys = collectR2Keys(blog);

    let strapiDocId: string | undefined = blog.strapiId;
    let coverIdFromStrapi: number | undefined;

    if (strapiDocId) {
      console.log("Using stored strapiId:", strapiDocId);
    } else {
      console.log("No strapiId stored — searching Strapi by slug:", blog.slug);

      const findRes = await fetch(
        `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${blog.slug}&publicationState=preview&populate[cover][fields]=id`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      if (!findRes.ok) {
        console.warn("Strapi search failed — deleting MongoDB only.");
        await Blog.findByIdAndDelete(blogId);
        if (r2Keys.length > 0) bulkDeleteFromR2(r2Keys).catch(console.error);
        return NextResponse.json({ message: "Blog deleted (not found in Strapi)" });
      }

      const findData = await findRes.json();
      const entry = findData.data?.[0];

      if (!entry) {
        console.log("Blog not found in Strapi — deleting MongoDB only.");
        await Blog.findByIdAndDelete(blogId);
        if (r2Keys.length > 0) bulkDeleteFromR2(r2Keys).catch(console.error);
        return NextResponse.json({ message: "Blog deleted (not found in Strapi)" });
      }

      strapiDocId = entry.documentId ?? String(entry.id);
      const attrs = entry.attributes || entry;
      const cover = attrs.cover?.data || attrs.cover;
      coverIdFromStrapi = cover?.id;
    }

    const deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return NextResponse.json(
        { error: `Strapi deletion failed: ${text}` },
        { status: deleteRes.status }
      );
    }
    console.log("Strapi blog deleted:", strapiDocId);

    const urlsToDelete: string[] = [];
    const legacyFilenames: string[] = [];

    if (blog.strapiCoverUrl) {
      urlsToDelete.push(blog.strapiCoverUrl);
    } else if (coverIdFromStrapi) {
      console.log("Cover will be deleted directly by id:", coverIdFromStrapi);
    }

    for (const img of blog.inlineImages ?? []) {
      if (img.strapiUrl) {
        urlsToDelete.push(img.strapiUrl);
      } else {
        const filename = filenameFromBase64((img as any).base64, img.id);
        if (filename) legacyFilenames.push(filename);
      }
    }

    const [urlIds, nameIds] = await Promise.all([
      lookupIdsByUrls(urlsToDelete, jwt),
      lookupIdsByNames(legacyFilenames, jwt),
    ]);

    const allIds = [...new Set([...urlIds, ...nameIds])];
    if (coverIdFromStrapi && !allIds.includes(coverIdFromStrapi)) {
      allIds.push(coverIdFromStrapi);
    }

    await adminDeleteStrapiFiles(allIds, jwt);

    // Delete MongoDB doc before fire-and-forget R2 (doc is the source of truth)
    await Blog.findByIdAndDelete(blogId);

    // Fire-and-forget R2 cleanup
    if (r2Keys.length > 0) {
      bulkDeleteFromR2(r2Keys).catch((err) =>
        console.error("R2 cleanup failed:", err)
      );
    }

    return NextResponse.json({ message: "Blog and media deleted from Strapi and MongoDB" });
  } catch (error: any) {
    console.error("Delete direct error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}