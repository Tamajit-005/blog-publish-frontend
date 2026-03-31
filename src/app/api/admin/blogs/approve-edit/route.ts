import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");
const MAX_CONTENT_CHARS = 100000;

async function loginOrRegister(user: any): Promise<string> {
  let password = user.strapi?.password;
  if (!password) password = crypto.randomBytes(24).toString("hex");

  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });
  if (res.ok) return (await res.json()).jwt;

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
  const mimeMatch = base64.match(/data:(image\/[^;]+);base64/);
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
  return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
}

async function uploadInlineImage(base64: string, filename: string, jwt: string) {
  const res = await fetch(base64);
  if (!res.ok) throw new Error("Failed to decode inline image");
  const blob = await res.blob();
  const form = new FormData();
  form.append("files", blob, filename);
  const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Inline image upload failed: " + await uploadRes.text());
  const uploaded = await uploadRes.json();
  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

async function uploadCover(
  base64: string,
  filename: string,
  jwt: string
): Promise<{ id: number; url: string } | null> {
  const res = await fetch(base64);
  if (!res.ok) throw new Error("Failed to decode base64 cover image");
  const blob = await res.blob();
  const form = new FormData();
  form.append("files", blob, filename);
  const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Cover upload failed: " + await uploadRes.text());
  const uploaded = await uploadRes.json();
  const fileObj = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  const url = extractFileUrl(fileObj);
  if (!fileObj?.id || !url) return null;
  return { id: fileObj.id, url };
}

function resolveCategoryIds(slugs: string[]): number[] {
  return slugs
    .map((slug) => FIXED_CATEGORIES.find((c) => c.slug === slug)?.id)
    .filter((id): id is number => id !== undefined);
}

/**
 * Batch-delete multiple Strapi media files by their URLs.
 * 1 GET (filters[$in]) + N parallel DELETEs regardless of file count.
 */
async function deleteStrapiFilesByUrls(fileUrls: string[], jwt: string): Promise<void> {
  if (fileUrls.length === 0) return;

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
  if (hashMap.size === 0) return;

  const hashParams = Array.from(hashMap.keys())
    .map((h, i) => `filters[hash][$in][${i}]=${encodeURIComponent(h)}`)
    .join("&");

  const searchRes = await fetch(`${STRAPI_URL}/api/upload/files?${hashParams}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!searchRes.ok) {
    console.warn("Batch file lookup failed:", searchRes.statusText);
    return;
  }

  const files: { id: number; hash: string }[] = await searchRes.json();
  if (!Array.isArray(files) || files.length === 0) return;

  await Promise.all(
    files.map((file) =>
      fetch(`${STRAPI_URL}/api/upload/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      })
        .then(() => console.log(`🗑️ Deleted Strapi file id=${file.id} (${file.hash})`))
        .catch((e) => console.warn(`Failed to delete file id=${file.id}:`, e))
    )
  );
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

    // STEP 2 — Identify inline images that need uploading vs already have a URL
    const needsNewCover =
      edits.coverImage != null && edits.coverImage !== "" && edits.coverImage.startsWith("data:");

    const activeImgs = (edits.inlineImages ?? []).filter(
      (img) =>
        img?.base64 && img?.placeholder && (edits.content || "").includes(img.placeholder)
    );
    const toUploadImgs = activeImgs.filter(
      (img) => !img.strapiUrl && img.base64?.startsWith("data:")
    );

    // STEP 3 — Parallel: new cover upload + all new inline image uploads
    const [coverUploadResult, ...inlineUploadResults] = await Promise.all([
      needsNewCover
        ? uploadCover(
            edits.coverImage!,
            edits.coverImageName || filenameFromBase64(edits.coverImage),
            jwt
          )
        : Promise.resolve(null),
      ...toUploadImgs.map(async (img) => {
        const filename = filenameFromBase64(img.base64, img.id);
        try {
          const uploaded = await uploadInlineImage(img.base64, filename, jwt);
          return { id: img.id as string, url: extractFileUrl(uploaded) };
        } catch (e) {
          console.error("Inline image upload failed for", img.id, e);
          return { id: img.id as string, url: null as string | null };
        }
      }),
    ]);

    // Build a map of newly uploaded inline images: img.id → strapiUrl
    const uploadedUrlMap = new Map<string, string>();
    for (const result of inlineUploadResults) {
      if (result?.url) uploadedUrlMap.set(result.id, result.url);
    }

    // STEP 4 — Build Strapi content + activeInlineImages list
    let strapiContent = sanitizeHtmlDataSrc(edits.content || "");
    const activeInlineImages: any[] = [];

    for (const img of activeImgs) {
      const strapiUrl = img.strapiUrl || uploadedUrlMap.get(img.id) || null;
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

    let mongoContent = removeStrayMarkdownBase64(edits.content || "");

    // STEP 5 — Cover resolution
    const oldCoverUrl = blog.strapiCoverUrl;
    const newCoverUrl = coverUploadResult?.url ?? null;
    const newCoverId = coverUploadResult?.id ?? null;
    const coverRemoved =
      edits.coverImage === "" || edits.coverImage === null || edits.coverImage === undefined;

    // STEP 6 — Category IDs (sync, no API call)
    const categoryIds = resolveCategoryIds(edits.categories ?? []);

    // STEP 7 — Update Strapi
    // ← Use blog.strapiId directly — no need to search by slug (saves 1 GET)
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

    const strapiUpdate = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatePayload }),
    });
    if (!strapiUpdate.ok)
      throw new Error("Strapi update failed: " + await strapiUpdate.text());

    // STEP 7.5 — Batch-delete old Strapi media no longer needed
    const urlsToDelete: string[] = [];

    if ((coverRemoved || newCoverUrl) && oldCoverUrl) urlsToDelete.push(oldCoverUrl);

    const oldInlineStrapiUrls = new Set<string>(
      (blog.inlineImages ?? []).map((img: any) => img.strapiUrl).filter(Boolean)
    );
    const newInlineStrapiUrls = new Set<string>(
      activeInlineImages.map((img: any) => img.strapiUrl).filter(Boolean)
    );

    for (const oldUrl of oldInlineStrapiUrls) {
      if (!newInlineStrapiUrls.has(oldUrl)) urlsToDelete.push(oldUrl);
    }

    await deleteStrapiFilesByUrls(urlsToDelete, jwt);

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
      blog.coverImage = edits.coverImage;    // keep base64 in MongoDB
      blog.strapiCoverUrl = newCoverUrl;     // persist Strapi URL separately
      if (edits.coverImageName) blog.coverImageName = edits.coverImageName;
    }
    // else: cover unchanged — both fields stay as-is

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