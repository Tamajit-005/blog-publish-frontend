import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";
import { getCachedJwt, setCachedJwt } from "@/lib/strapiJwtCache";


const STRAPI_URL = process.env.STRAPI_URL!.replace(new RegExp("/$"), "");
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN!;
const MAX_CONTENT_CHARS = 100_000;


async function loginOrRegister(user: any): Promise<string> {
  const cached = getCachedJwt(user.email);
  if (cached) return cached;

  let password = user.strapi?.password;
  if (!password) password = crypto.randomBytes(24).toString("hex");

  let loginRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    setCachedJwt(user.email, data.jwt);
    return data.jwt;
  }

  if (user.strapi?.password && user.strapi?.userId) {
    console.warn(`[Strapi] Login failed for ${user.email} — attempting admin password reset`);
    const newPassword = crypto.randomBytes(24).toString("hex");

    const resetRes = await fetch(`${STRAPI_URL}/api/users/${user.strapi.userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${STRAPI_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (resetRes.ok) {
      const retryRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: user.email, password: newPassword }),
      });
      if (retryRes.ok) {
        user.strapi.password = newPassword;
        await user.save();
        const data = await retryRes.json();
        setCachedJwt(user.email, data.jwt);
        return data.jwt;
      }
    }

    console.warn(`[Strapi] Admin reset failed — re-registering.`);
    user.strapi = undefined;
    password = crypto.randomBytes(24).toString("hex");
  }

  const registerRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, username: user.username, password }),
  });
  if (!registerRes.ok) throw new Error(`Strapi register failed: ${await registerRes.text()}`);

  const data = await registerRes.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  setCachedJwt(user.email, data.jwt);
  return data.jwt;
}


function filenameFromBase64(base64?: string, fallback = "image"): string {
  if (!base64) return `${fallback}.png`;
  const nameMatch = base64.match(/name=([^;]+);base64,/);
  if (nameMatch?.[1]) {
    try { return decodeURIComponent(nameMatch[1]); } catch { return nameMatch[1]; }
  }
  const mimeMatch = base64.match(new RegExp("^data:(image/[^;]+);base64,"));
  const mime = mimeMatch?.[1] || "image/png";
  const extMap: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  };
  return `${fallback}.${extMap[mime] || "png"}`;
}


function extractFileUrl(fileObj: any): string | null {
  if (!fileObj) return null;
  const url =
    (typeof fileObj === "string" ? fileObj : null) ??
    fileObj.url ?? fileObj.attributes?.url ?? fileObj.data?.attributes?.url ?? null;
  if (!url) return null;
  return new RegExp("^https?://", "i").test(url) ? url : `${STRAPI_URL}${url}`;
}


/**
 * ONE POST — cover + all inline images in a single FormData.
 * Key is "cover" for the cover image, or img.id for each inline image.
 * Strapi returns an ordered array matching the append order.
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
  if (!uploadRes.ok) throw new Error(`Batch upload failed: ${await uploadRes.text()}`);

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


function resolveCategoryIds(slugs: string[]): number[] {
  return slugs
    .map((slug) => FIXED_CATEGORIES.find((c) => c.slug === slug)?.id)
    .filter((id): id is number => id !== undefined);
}


export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId } = await req.json();
    if (!blogId)
      return NextResponse.json({ error: "Blog ID required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || blog.status !== "pending")
      return NextResponse.json({ error: "Invalid blog" }, { status: 400 });

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");
    if (!user)
      return NextResponse.json({ error: "Author not found" }, { status: 404 });

    // STEP 1 — Strapi auth (JWT cached after first call)
    const jwt = await loginOrRegister(user);

    // STEP 2 — Decode all base64 blobs locally in parallel (memory-only, no network)
    const inlineImages: any[] = blog.inlineImages ?? [];
    const blobJobs: Promise<{ key: string; blob: Blob; filename: string } | null>[] = [];

    if (blog.coverImage?.startsWith("data:")) {
      blobJobs.push(
        fetch(blog.coverImage)
          .then(async (r) => ({
            key: "cover",
            blob: await r.blob(),
            filename: blog.coverImageName || filenameFromBase64(blog.coverImage),
          }))
          .catch((e) => { console.error("Cover decode failed:", e); return null; })
      );
    }

    for (const img of inlineImages) {
      if (!img?.base64) continue;
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

    // PHASE 1 — ONE POST (all images batched)
    const uploadResultMap = await batchUploadImages(imagesToUpload, jwt);

    const coverUpload = uploadResultMap.get("cover") ?? null;
    const coverId = coverUpload?.id ?? null;
    const coverUrl = coverUpload?.url ?? null;

    // STEP 3 — Build content with resolved inline URLs
    let content = blog.content || "";
    const savedInlineImages: any[] = [];

    for (const img of inlineImages) {
      if (!img?.base64) { savedInlineImages.push(img); continue; }
      const uploaded = uploadResultMap.get(img.id);
      if (uploaded?.url) {
        content = content.split(img.placeholder).join(`![image](${uploaded.url})`);
        savedInlineImages.push({ ...img, strapiUrl: uploaded.url });
      } else {
        savedInlineImages.push(img);
      }
    }

    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);

    // STEP 4 — Category IDs (sync, no API call)
    const categoryIds = resolveCategoryIds(blog.categories || []);

    // PHASE 2 — ONE POST to create the blog in Strapi
    let strapiDocId: string | null = blog.strapiId ?? null;

    if (strapiDocId) {
      console.warn(`⚠️ strapiId already set (${strapiDocId}) — skipping Strapi create.`);
    } else {
      const createRes = await fetch(`${STRAPI_URL}/api/blogs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            title: blog.title,
            slug: blog.slug,
            description: blog.description || content.slice(0, 160),
            content,
            category: categoryIds,
            cover: coverId,
            publishedAt: new Date().toISOString(),
          },
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        const isSlugConflict = errData?.error?.details?.errors?.some(
          (e: any) => e.path?.includes("slug") && e.name === "ValidationError"
        );

        if (isSlugConflict) {
          console.warn(`⚠️ Slug conflict on "${blog.slug}" — recovering existing Strapi entry...`);
          const searchRes = await fetch(
            `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${encodeURIComponent(blog.slug)}&fields[0]=id`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const existing = searchData?.data?.[0];
            strapiDocId = existing?.documentId ?? String(existing?.id) ?? null;
            console.warn(`✅ Recovered Strapi documentId: ${strapiDocId}`);
          }
          if (!strapiDocId)
            throw new Error(`Slug conflict on "${blog.slug}" but could not find existing entry.`);
        } else {
          throw new Error(`Blog create failed: ${JSON.stringify(errData)}`);
        }
      } else {
        const created = await createRes.json();
        strapiDocId = created.data.documentId ?? String(created.data.id);
      }
    }

    // STEP 5 — Update MongoDB
    blog.status = "published";
    blog.strapiId = strapiDocId!;
    blog.publishedAt = new Date();
    blog.adminNotes = undefined;
    blog.rejectedAt = undefined;
    blog.inlineImages = savedInlineImages;
    if (coverUrl) blog.strapiCoverUrl = coverUrl;
    await blog.save();

    return NextResponse.json({ success: true, strapiId: blog.strapiId });
  } catch (err: any) {
    console.error("❌ Approval error:", err);
    return NextResponse.json({ error: err.message || "Approval failed" }, { status: 500 });
  }
}