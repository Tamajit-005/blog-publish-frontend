import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!;
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
  return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL.replace(/\/$/, "")}${url}`;
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

async function uploadCover(base64: string, filename: string, jwt: string) {
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
  return fileObj?.id ?? null;
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

    // STEP 2 — Content with inline images
    let content: string = edits.content || "";
    content = sanitizeHtmlDataSrc(content);

    if (Array.isArray(edits.inlineImages)) {
      for (const img of edits.inlineImages) {
        if (!img?.base64 || !img?.placeholder) continue;
        if (!img.base64.startsWith("data:")) continue;
        const filename = filenameFromBase64(img.base64, img.id);
        try {
          const uploaded = await uploadInlineImage(img.base64, filename, jwt);
          const url = extractFileUrl(uploaded);
          if (url) {
            content = content.split(img.placeholder).join(`![image](${url})`);
          }
        } catch (e) {
          console.error("Inline image upload failed for", img.id, e);
        }
      }
    }

    content = removeStrayMarkdownBase64(content);
    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);

    // STEP 3 — Cover image resolution
    // ✅ Three states: "" = removed, base64 = new upload, URL = unchanged existing
    let coverId: number | null = null;
    let coverRemoved = false;

    if (edits.coverImage === "" || edits.coverImage === null || edits.coverImage === undefined) {
      // User explicitly removed the cover image
      coverRemoved = true;
    } else if (edits.coverImage.startsWith("data:")) {
      // New base64 upload
      coverId = await uploadCover(
        edits.coverImage,
        edits.coverImageName || filenameFromBase64(edits.coverImage),
        jwt,
      );
    }
    // else: existing URL — no action needed, Strapi already has it

    // STEP 4 — Category IDs
    const categoryIds = await resolveCategoryIds(edits.categories ?? [], jwt);

    // STEP 5 — Find Strapi document ID
    const findRes = await fetch(
      `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${encodeURIComponent(blog.slug)}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    const findData = await findRes.json();
    const strapiDocId = findData.data?.[0]?.documentId ?? blog.strapiId;

    // STEP 6 — Update Strapi
    const updatePayload: any = {
      title: edits.title,
      slug: edits.slug,
      description: edits.description,
      content,
      category: categoryIds,
    };

    if (coverId) {
      updatePayload.cover = coverId; // New cover uploaded
    } else if (coverRemoved) {
      updatePayload.cover = null; // ✅ Explicitly null to remove cover in Strapi
    }
    // else: existing URL cover — omit from payload so Strapi keeps it

    const strapiUpdate = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: updatePayload }),
    });
    if (!strapiUpdate.ok)
      throw new Error("Strapi update failed: " + await strapiUpdate.text());

    // STEP 7 — Apply edits to MongoDB
    blog.title = edits.title;
    blog.slug = edits.slug;
    blog.description = edits.description;
    blog.content = content;
    blog.categories = edits.categories;
    blog.inlineImages = [];

    // ✅ Handle cover image state correctly in MongoDB
    if (coverRemoved) {
      blog.coverImage = undefined;
      blog.coverImageName = undefined;
    } else if (edits.coverImage) {
      blog.coverImage = edits.coverImage;
      if (edits.coverImageName) blog.coverImageName = edits.coverImageName;
    }
    // else: existing URL — blog.coverImage already has the right value, no change needed

    // Clear pending state
    blog.isEditPending = false;
    blog.pendingEdit = undefined;

    await blog.save();

    return NextResponse.json({ success: true, message: "Edit approved and published" });
  } catch (err: any) {
    console.error("Approve-edit error:", err);
    return NextResponse.json({ error: err.message ?? "Approval failed" }, { status: 500 });
  }
}
