import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";

const STRAPI_URL = process.env.STRAPI_URL!;
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN!;
const MAX_CONTENT_CHARS = 100_000;

/* ───────────────── HELPERS ───────────────── */

async function loginOrRegister(user: any): Promise<{ jwt: string }> {
  let password = user.strapi?.password;
  if (!password) password = crypto.randomBytes(24).toString("hex");

  let loginRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });

  if (loginRes.ok) return loginRes.json();

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
        console.info(`[Strapi] Password reset successful for ${user.email}`);
        return retryRes.json();
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
  console.info(`[Strapi] Registered new Strapi user for ${user.email}`);
  return data;
}

function filenameFromBase64(base64?: string, fallback = "image") {
  if (!base64) return `${fallback}.png`;
  const nameMatch = base64.match(/name=([^;]+);base64,/);
  if (nameMatch?.[1]) {
    try { return decodeURIComponent(nameMatch[1]); } catch { return nameMatch[1]; }
  }
  const mimeMatch = base64.match(/^data:(image\/[^;]+);base64,/);
  const mime = mimeMatch?.[1] || "image/png";
  const extMap: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  };
  return `${fallback}.${extMap[mime] || "png"}`;
}

function extractFileUrl(fileObj: any): string | null {
  if (!fileObj) return null;
  let url: any = null;
  if (typeof fileObj === "string") url = fileObj;
  if (!url && fileObj.url) url = fileObj.url;
  if (!url && fileObj.attributes?.url) url = fileObj.attributes.url;
  if (!url && fileObj.data?.attributes?.url) url = fileObj.data.attributes.url;
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : STRAPI_URL.replace(/\/$/, "") + url;
}

async function uploadCover(
  base64?: string,
  filename?: string,
  jwt?: string
): Promise<{ id: number | null; url: string | null }> {
  if (!base64 || !filename || !jwt) return { id: null, url: null };
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
  if (!uploadRes.ok) throw new Error(`Cover upload failed: ${await uploadRes.text()}`);
  const uploaded = await uploadRes.json();
  const fileObj = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  return { id: fileObj?.id ?? null, url: extractFileUrl(fileObj) };
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
  if (!uploadRes.ok) throw new Error(`Inline image upload failed: ${await uploadRes.text()}`);
  const uploaded = await uploadRes.json();
  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

function resolveCategoryIds(slugs: string[]): number[] {
  return slugs
    .map((slug) => FIXED_CATEGORIES.find((c) => c.slug === slug)?.id)
    .filter((id): id is number => id !== undefined);
}

/* ───────────────── ROUTE ───────────────── */

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

    /* STEP 1: LOGIN / REGISTER STRAPI USER */
    const { jwt } = await loginOrRegister(user);

    /* STEP 2+3: Upload cover + all inline images in parallel
     * Cover and inline uploads are independent — no reason to run them sequentially.
     */
    const inlineImages = blog.inlineImages ?? [];

    const [coverUpload, ...inlineUploadResults] = await Promise.all([
      uploadCover(blog.coverImage, blog.coverImageName, jwt),
      ...inlineImages.map(async (img: any) => {
        if (!img?.base64) return { img, url: null as string | null };
        const filename = filenameFromBase64(img.base64, img.id);
        try {
          const uploaded = await uploadInlineImage(img.base64, filename, jwt);
          return { img, url: extractFileUrl(uploaded) };
        } catch (e) {
          console.error("Inline image upload failed:", e);
          return { img, url: null as string | null };
        }
      }),
    ]);

    const { id: coverId, url: coverUrl } = coverUpload;

    let content = blog.content || "";
    const savedInlineImages: any[] = [];

    for (const { img, url } of inlineUploadResults) {
      if (url) {
        content = content.split(img.placeholder).join(`![image](${url})`);
        savedInlineImages.push({ ...img, strapiUrl: url });
      } else {
        savedInlineImages.push(img);
      }
    }

    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);

    /* STEP 4: RELATIONS */
    const categoryIds = resolveCategoryIds(blog.categories || []);

    /* STEP 5: CREATE BLOG IN STRAPI */
    let strapiDocId: string | null = null;

    if (blog.strapiId) {
      strapiDocId = blog.strapiId;
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
            throw new Error(`Slug conflict on "${blog.slug}" but could not find existing Strapi entry.`);
        } else {
          throw new Error(`Blog create failed: ${JSON.stringify(errData)}`);
        }
      } else {
        const created = await createRes.json();
        strapiDocId = created.data.documentId ?? String(created.data.id);
      }
    }

    /* STEP 6: UPDATE MONGO */
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