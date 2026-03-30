import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

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

async function uploadCover(base64: string, filename: string, jwt: string): Promise<{ id: number; url: string } | null> {
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

async function resolveCategoryIds(slugs: string[], jwt: string) {
  const ids: number[] = [];
  for (const slug of slugs) {
    const res = await fetch(
      `${STRAPI_URL}/api/categories?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    if (!res.ok) continue;
    const json = await res.json();
    if (json.data?.[0]?.id) ids.push(json.data[0].id);
  }
  return ids;
}

async function deleteStrapiFileByUrl(fileUrl: string, jwt: string): Promise<void> {
  try {
    const urlPath = new URL(fileUrl).pathname;
    const fullFilename = urlPath.split("/").pop();
    if (!fullFilename) return;

    // Strapi hash = filename without extension
    const hash = fullFilename.replace(/\.[^/.]+$/, "");

    const searchRes = await fetch(
      `${STRAPI_URL}/api/upload/files?filters[hash][$eq]=${encodeURIComponent(hash)}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    if (!searchRes.ok) return;
    const files = await searchRes.json();
    if (!Array.isArray(files) || files.length === 0) return;

    const fileId = files[0].id;
    await fetch(`${STRAPI_URL}/api/upload/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    console.log(`🗑️ Deleted Strapi file: ${fullFilename}`);
  } catch (e) {
    console.warn(`Failed to delete Strapi file by URL "${fileUrl}":`, e);
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
    if (!user) return NextResponse.json({ error: "Author not found" }, { status: 404 });

    // STEP 1 — Strapi auth
    const jwt = await loginOrRegister(user);
    const edits = blog.pendingEdit;

    // STEP 2 — Build Strapi content (placeholders → Strapi URLs)
    // strapiContent is used only for the Strapi update payload.
    // mongoContent keeps original placeholders so getProcessedContent works
    // when serving the blog directly from MongoDB without Strapi.
    let strapiContent: string = edits.content || "";
    strapiContent = sanitizeHtmlDataSrc(strapiContent);

    // Track active inline images to save back to MongoDB
    const activeInlineImages: any[] = [];

    if (Array.isArray(edits.inlineImages)) {
      for (const img of edits.inlineImages) {
        if (!img?.base64 || !img?.placeholder) continue;

        // Skip images not referenced in the edited content
        if (!(edits.content || "").includes(img.placeholder)) continue;

        // FIX: If this image was already uploaded to Strapi in a previous approval,
        // reuse the existing Strapi URL instead of re-uploading the base64.
        // img.strapiUrl is set below when first uploaded and persisted to MongoDB.
        if (img.strapiUrl) {
          strapiContent = strapiContent.split(img.placeholder).join(`![image](${img.strapiUrl})`);
          activeInlineImages.push(img);
          continue;
        }

        // Not yet uploaded — upload now
        if (!img.base64.startsWith("data:")) {
          // Unexpected non-base64, non-strapiUrl value — skip upload, keep as-is
          activeInlineImages.push(img);
          continue;
        }

        const filename = filenameFromBase64(img.base64, img.id);
        try {
          const uploaded = await uploadInlineImage(img.base64, filename, jwt);
          const url = extractFileUrl(uploaded);
          if (url) {
            strapiContent = strapiContent.split(img.placeholder).join(`![image](${url})`);
            // Persist the Strapi URL so future approvals skip re-upload
            activeInlineImages.push({ ...img, strapiUrl: url });
          } else {
            activeInlineImages.push(img);
          }
        } catch (e) {
          console.error("Inline image upload failed for", img.id, e);
          activeInlineImages.push(img);
        }
      }
    }

    strapiContent = removeStrayMarkdownBase64(strapiContent);
    if (strapiContent.length > MAX_CONTENT_CHARS) strapiContent = strapiContent.slice(0, MAX_CONTENT_CHARS);

    // mongoContent: keep original placeholders, just clean stray raw base64 markdown
    let mongoContent: string = edits.content || "";
    mongoContent = removeStrayMarkdownBase64(mongoContent);

    // STEP 3 — Cover image resolution
    const oldCoverUrl = blog.coverImage?.startsWith("http") ? blog.coverImage : undefined;
    let newCoverUrl: string | null = null;
    let coverRemoved = false;

    if (edits.coverImage === "" || edits.coverImage === null || edits.coverImage === undefined) {
      coverRemoved = true;
    } else if (edits.coverImage.startsWith("data:")) {
      const uploaded = await uploadCover(
        edits.coverImage,
        edits.coverImageName || filenameFromBase64(edits.coverImage),
        jwt,
      );
      if (uploaded) {
        newCoverUrl = uploaded.url;
        (edits as any)._uploadedCoverId = uploaded.id;
      }
    }

    // STEP 4 — Category IDs
    const categoryIds = await resolveCategoryIds(edits.categories ?? [], jwt);

    // STEP 5 — Find Strapi document ID
    const findRes = await fetch(
      `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${encodeURIComponent(blog.slug)}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    const findData = await findRes.json();
    const strapiDocId = findData.data?.[0]?.documentId ?? blog.strapiId;

    // STEP 6 — Update Strapi (uses strapiContent with resolved URLs)
    const updatePayload: any = {
      title: edits.title,
      slug: edits.slug,
      description: edits.description,
      content: strapiContent,
      category: categoryIds,
    };

    if ((edits as any)._uploadedCoverId) {
      updatePayload.cover = (edits as any)._uploadedCoverId;
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

    // STEP 6.5 — Delete old Strapi media no longer needed

    // Cover: delete old if removed or replaced
    if ((coverRemoved || newCoverUrl) && oldCoverUrl) {
      await deleteStrapiFileByUrl(oldCoverUrl, jwt);
    }

    // FIX: Inline image orphan detection — compare strapiUrl values on old vs new
    // blog.inlineImages holds the previously-saved set (each may have strapiUrl).
    // activeInlineImages holds the newly-approved set.
    // Any strapiUrl present in old but absent in new means that image was removed.
    const oldInlineStrapiUrls = new Set<string>(
      (blog.inlineImages ?? [])
        .map((img: any) => img.strapiUrl)
        .filter(Boolean)
    );
    const newInlineStrapiUrls = new Set<string>(
      activeInlineImages
        .map((img: any) => img.strapiUrl)
        .filter(Boolean)
    );

    for (const oldUrl of oldInlineStrapiUrls) {
      if (!newInlineStrapiUrls.has(oldUrl)) {
        await deleteStrapiFileByUrl(oldUrl, jwt);
      }
    }

    // STEP 7 — Apply edits to MongoDB
    blog.title = edits.title;
    blog.slug = edits.slug;
    blog.description = edits.description;

    // Save mongoContent (with placeholders) so getProcessedContent works
    // when serving directly from MongoDB without Strapi
    blog.content = mongoContent;

    blog.categories = edits.categories;

    // Keep active inline images in MongoDB (base64 + strapiUrl for future approvals)
    blog.inlineImages = activeInlineImages;

    if (coverRemoved) {
      blog.coverImage = undefined;
      blog.coverImageName = undefined;
    } else if (newCoverUrl) {
      blog.coverImage = newCoverUrl;
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