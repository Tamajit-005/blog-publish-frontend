import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";
import { getCachedJwt, setCachedJwt } from "@/lib/strapiJwtCache";


const STRAPI_URL = process.env.STRAPI_URL!.replace(new RegExp("/$"), "");
const MAX_CONTENT_CHARS = 100000;


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
  if (!res.ok) throw new Error("Strapi register failed: " + await res.text());

  const data = await res.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  setCachedJwt(user.email, data.jwt);
  return data.jwt;
}


function sanitizeHtmlDataSrc(content: string) {
  return content.replace(/src="data:[^"]*"/g, "");
}


function removeStrayMarkdownBase64(content: string) {
  return content.replace(/!\[.*?\]\(data:[^)]*\)/g, "![image removed]");
}


function filenameFromBase64(base64?: string, fallback = "image"): string {
  if (!base64) return `${fallback}.png`;
  const nameMatch = base64.match(/name=([^;]+);base64/);
  if (nameMatch?.[1]) {
    try { return decodeURIComponent(nameMatch[1]); } catch { return nameMatch[1]; }
  }
  const mimeMatch = base64.match(new RegExp("^data:(image/[^;]+);base64,"));
  const mime = mimeMatch?.[1] ?? "image/png";
  const extMap: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  };
  return `${fallback}.${extMap[mime] ?? "png"}`;
}


function extractFileUrl(fileObj: any): string | null {
  if (!fileObj) return null;
  const url =
    (typeof fileObj === "string" ? fileObj : null) ??
    fileObj.url ?? fileObj.attributes?.url ?? fileObj.data?.attributes?.url ?? null;
  if (!url) return null;
  return new RegExp("^https?://", "i").test(url) ? url : `${STRAPI_URL}${url}`;
}


function resolveCategoryIds(slugs: string[]): number[] {
  return slugs
    .map((slug) => FIXED_CATEGORIES.find((c) => c.slug === slug)?.id)
    .filter((id): id is number => id !== undefined);
}


/**
 * ONE POST — all images (cover + inline) batched into a single FormData.
 * Strapi returns an ordered array matching append order.
 */
async function batchUploadImages(
  images: { key: string; blob: Blob; filename: string }[],
  jwt: string
): Promise<Map<string, { id: number; url: string }>> {
  const result = new Map<string, { id: number; url: string }>();
  if (images.length === 0) return result;

  const form = new FormData();
  for (const img of images) {
    form.append("files", img.blob, img.filename);
  }

  const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Batch upload failed: " + await uploadRes.text());

  const uploaded: any[] = await uploadRes.json();
  if (!Array.isArray(uploaded)) return result;

  for (let i = 0; i < images.length && i < uploaded.length; i++) {
    const fileObj = uploaded[i];
    const url = extractFileUrl(fileObj);
    if (fileObj?.id && url) {
      result.set(images[i].key, { id: fileObj.id, url });
    }
  }

  return result;
}


/**
 * ONE GET — resolve all old file URLs → Strapi IDs via batch hash lookup.
 * Runs in parallel with batchUploadImages.
 */
async function lookupStrapiFileIds(
  fileUrls: string[],
  jwt: string
): Promise<{ id: number; hash: string }[]> {
  if (fileUrls.length === 0) return [];

  const hashMap = new Map<string, string>();
  for (const fileUrl of fileUrls) {
    try {
      const urlPath = new URL(fileUrl).pathname;
      const fullFilename = urlPath.split("/").pop();
      if (!fullFilename) continue;
      hashMap.set(fullFilename.replace(/\.[^/.]+$/, ""), fileUrl);
    } catch {
      console.warn(`Skipping invalid URL: ${fileUrl}`);
    }
  }
  if (hashMap.size === 0) return [];

  const hashParams = Array.from(hashMap.keys())
    .map((h, i) => `filters[hash][$in][${i}]=${encodeURIComponent(h)}`)
    .join("&");

  const searchRes = await fetch(`${STRAPI_URL}/api/upload/files?${hashParams}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!searchRes.ok) {
    console.warn("Batch file lookup failed:", searchRes.statusText);
    return [];
  }

  const files: { id: number; hash: string }[] = await searchRes.json();
  return Array.isArray(files) ? files : [];
}


/**
 * ONE DELETE — bulk delete via custom Strapi extension at /api/media/bulk-delete.
 * Requires src/extensions/upload/strapi-server.ts in the Strapi project.
 * Must only run AFTER the Strapi PUT completes (FK constraint safety).
 */
async function deleteStrapiFiles(
  files: { id: number; hash: string }[],
  jwt: string
): Promise<void> {
  if (files.length === 0) return;

  const ids = files.map((f) => f.id);

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


export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId } = await req.json();
    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isEditPending || !blog.pendingEdit)
      return NextResponse.json({ error: "No pending edit found" }, { status: 400 });

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");
    if (!user)
      return NextResponse.json({ error: "Author not found" }, { status: 404 });

    // STEP 1 — Strapi auth
    const jwt = await loginOrRegister(user);
    const edits = blog.pendingEdit;

    // STEP 2 — Classify images + compute urlsToDelete EARLY
    const needsNewCover =
      edits.coverImage != null && edits.coverImage !== "" && edits.coverImage.startsWith("data:");
    const coverRemoved =
      edits.coverImage === "" || edits.coverImage === null || edits.coverImage === undefined;
    const oldCoverUrl = blog.strapiCoverUrl;

    const activeImgs = (edits.inlineImages ?? []).filter(
      (img) =>
        img?.base64 && img?.placeholder && (edits.content || "").includes(img.placeholder)
    );
    const toUploadImgs = activeImgs.filter(
      (img) => !img.strapiUrl && img.base64?.startsWith("data:")
    );

    const urlsToDelete: string[] = [];
    if ((coverRemoved || needsNewCover) && oldCoverUrl) urlsToDelete.push(oldCoverUrl);

    const oldInlineStrapiUrls = new Set<string>(
      (blog.inlineImages ?? []).map((img: any) => img.strapiUrl).filter(Boolean)
    );
    const keptInlineStrapiUrls = new Set<string>(
      activeImgs.map((img: any) => img.strapiUrl).filter(Boolean)
    );
    for (const oldUrl of oldInlineStrapiUrls) {
      if (!keptInlineStrapiUrls.has(oldUrl)) urlsToDelete.push(oldUrl);
    }

    // STEP 3 — Decode all base64 blobs locally in parallel (memory-only, no network)
    const blobJobs: Promise<{ key: string; blob: Blob; filename: string } | null>[] = [];

    if (needsNewCover) {
      blobJobs.push(
        fetch(edits.coverImage!)
          .then(async (r) => ({
            key: "cover",
            blob: await r.blob(),
            filename: edits.coverImageName || filenameFromBase64(edits.coverImage),
          }))
          .catch((e) => { console.error("Cover decode failed:", e); return null; })
      );
    }

    for (const img of toUploadImgs) {
      blobJobs.push(
        fetch(img.base64)
          .then(async (r) => ({
            key: img.id as string,
            blob: await r.blob(),
            filename: filenameFromBase64(img.base64, img.id),
          }))
          .catch((e) => { console.error("Inline decode failed for", img.id, e); return null; })
      );
    }

    const imagesToUpload = (await Promise.all(blobJobs)).filter(
      (x): x is { key: string; blob: Blob; filename: string } => x !== null
    );

    // PHASE 1 — ONE POST (all images batched) + ONE GET (hash lookup) in parallel
    const [uploadResultMap, filesToDelete] = await Promise.all([
      batchUploadImages(imagesToUpload, jwt),
      lookupStrapiFileIds(urlsToDelete, jwt),
    ]);

    // STEP 4 — Build Strapi content + activeInlineImages list
    let strapiContent = sanitizeHtmlDataSrc(edits.content || "");
    const activeInlineImages: any[] = [];

    for (const img of activeImgs) {
      const strapiUrl = img.strapiUrl || uploadResultMap.get(img.id)?.url || null;
      if (strapiUrl) {
        strapiContent = strapiContent.split(img.placeholder).join(`![image](${strapiUrl})`);
        activeInlineImages.push({ ...img, strapiUrl });
      } else {
        activeInlineImages.push(img);
      }
    }

    strapiContent = removeStrayMarkdownBase64(strapiContent);
    if (strapiContent.length > MAX_CONTENT_CHARS)
      strapiContent = strapiContent.slice(0, MAX_CONTENT_CHARS);

    const mongoContent = removeStrayMarkdownBase64(edits.content || "");

    // STEP 5 — Cover resolution
    const coverUpload = uploadResultMap.get("cover") ?? null;
    const newCoverUrl = coverUpload?.url ?? null;
    const newCoverId = coverUpload?.id ?? null;

    // STEP 6 — Category IDs (sync, no API call)
    const categoryIds = resolveCategoryIds(edits.categories ?? []);

    // STEP 7 — Build Strapi update payload
    const strapiDocId = blog.strapiId;
    if (!strapiDocId)
      throw new Error("No strapiId stored — cannot update blog in Strapi.");

    const updatePayload: any = {
      title: edits.title,
      slug: edits.slug,
      description: edits.description,
      content: strapiContent,
      category: categoryIds,
    };

    if (newCoverId) {
      updatePayload.cover = newCoverId;
    } else if (coverRemoved) {
      updatePayload.cover = null;
    }

    // PHASE 2a — PUT must complete before deletes (FK constraint safety)
    const strapiUpdate = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatePayload }),
    });
    if (!strapiUpdate.ok)
      throw new Error("Strapi update failed: " + await strapiUpdate.text());

    // PHASE 2b — ONE DELETE (bulk) after PUT (IDs pre-resolved in PHASE 1)
    await deleteStrapiFiles(filesToDelete, jwt);

    // STEP 8 — Apply edits to MongoDB
    blog.title = edits.title;
    blog.slug = edits.slug;
    blog.description = edits.description;
    blog.content = mongoContent;
    blog.categories = edits.categories;
    blog.inlineImages = activeInlineImages;

    if (coverRemoved) {
      blog.coverImage = undefined;
      blog.coverImageName = undefined;
      blog.strapiCoverUrl = undefined;
    } else if (newCoverUrl) {
      blog.coverImage = edits.coverImage;
      blog.strapiCoverUrl = newCoverUrl;
      if (edits.coverImageName) blog.coverImageName = edits.coverImageName;
    }

    blog.adminNotes = undefined;
    blog.isEditPending = false;
    blog.pendingEdit = undefined;

    await blog.save();

    return NextResponse.json({ success: true, message: "Edit approved and published" });
  } catch (err: any) {
    console.error("Approve-edit error:", err);
    return NextResponse.json({ error: err.message ?? "Approval failed" }, { status: 500 });
  }
}