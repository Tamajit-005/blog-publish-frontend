import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!;
// Reuse the existing STRAPI_API_TOKEN as the admin token for password resets
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN!;
const MAX_CONTENT_CHARS = 100_000;

/* ───────────────── HELPERS ───────────────── */

/*
 * Self-healing login/register flow:
 *
 * 1. Try login with stored/generated password
 * 2. If stored credentials fail → reset password via Strapi admin API token
 * 3. If admin reset fails (user was deleted) → clear stale record and re-register
 * 4. If no stored credentials → register fresh
 */
async function loginOrRegister(user: any): Promise<{ jwt: string }> {
  let password = user.strapi?.password;

  if (!password) {
    password = crypto.randomBytes(24).toString("hex");
  }

  // ── Step 1: Try login with stored/generated password ──
  let loginRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });

  if (loginRes.ok) {
    return loginRes.json();
  }

  // ── Step 2: Stored credentials exist but login failed ──
  // Attempt to reset the password via the Strapi admin API token
  if (user.strapi?.password && user.strapi?.userId) {
    console.warn(
      `[Strapi] Login failed for ${user.email} (userId: ${user.strapi.userId}) — attempting admin password reset`
    );

    const newPassword = crypto.randomBytes(24).toString("hex");

    const resetRes = await fetch(
      `${STRAPI_URL}/api/users/${user.strapi.userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${STRAPI_ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    if (resetRes.ok) {
      // Retry login with the new password
      const retryRes = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: user.email, password: newPassword }),
      });

      if (retryRes.ok) {
        // Persist the new password back to MongoDB
        user.strapi.password = newPassword;
        await user.save();
        console.info(`[Strapi] Password reset successful for ${user.email}`);
        return retryRes.json();
      }
    }

    // ── Step 3: Admin reset failed — user was deleted from Strapi ──
    // Clear the stale strapi record and fall through to re-register
    console.warn(
      `[Strapi] Admin reset failed for userId ${user.strapi.userId} — user likely deleted from Strapi. Re-registering.`
    );
    user.strapi = undefined;
    password = crypto.randomBytes(24).toString("hex");
  }

  // ── Step 4: Register fresh Strapi user ──
  const registerRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      username: user.username,
      password,
    }),
  });

  if (!registerRes.ok) {
    const errText = await registerRes.text();
    throw new Error(`Strapi register failed: ${errText}`);
  }

  const data = await registerRes.json();

  // Persist new Strapi credentials to MongoDB
  user.strapi = {
    userId: data.user?.id,
    password,
  };
  await user.save();

  console.info(
    `[Strapi] Registered new Strapi user for ${user.email} (userId: ${data.user?.id})`
  );

  return data;
}

/* Safety net for legacy base64 and stray HTML data src attributes */
function sanitizeHtmlDataSrc(content: string) {
  return content.replace(/src=["']data:[^"']+["']/g, "");
}

/* Remove any stray markdown images that still point to data: URIs */
function removeStrayMarkdownBase64(content: string) {
  return content.replace(
    /!\[([^\]]*)\]\((data:[^)]+)\)/g,
    "![image removed]"
  );
}

async function resolveCategoryIds(slugs: string[], jwt: string) {
  const ids: number[] = [];

  for (const slug of slugs) {
    const res = await fetch(
      `${STRAPI_URL}/api/categories?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );

    if (!res.ok) continue;

    const json = await res.json();
    if (json.data?.[0]?.id) ids.push(json.data[0].id);
  }

  return ids;
}

/* Extract filename from base64 data URL if present */
function filenameFromBase64(base64?: string, fallback = "image") {
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

  const ext = extMap[mime] || "png";
  return `${fallback}.${ext}`;
}

/* Resolve Strapi file URL safely */
function extractFileUrl(fileObj: any): string | null {
  if (!fileObj) return null;

  let url: any = null;

  if (typeof fileObj === "string") url = fileObj;
  if (!url && fileObj.url) url = fileObj.url;
  if (!url && fileObj.attributes?.url) url = fileObj.attributes.url;
  if (!url && fileObj.data?.attributes?.url) url = fileObj.data.attributes.url;

  if (!url) return null;

  if (!/^https?:\/\//i.test(url)) {
    return STRAPI_URL.replace(/\/$/, "") + url;
  }

  return url;
}

/* ───── Upload COVER image ───── */
async function uploadCover(
  base64?: string,
  filename?: string,
  jwt?: string
) {
  if (!base64 || !filename || !jwt) return null;

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

  if (!uploadRes.ok) {
    throw new Error(`Cover upload failed: ${await uploadRes.text()}`);
  }

  const uploaded = await uploadRes.json();
  const fileObj = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  return fileObj?.id ?? null;
}

/* ───── Upload INLINE image ───── */
async function uploadInlineImage(
  base64: string,
  filename: string,
  jwt: string
) {
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

  if (!uploadRes.ok) {
    throw new Error(`Inline image upload failed: ${await uploadRes.text()}`);
  }

  const uploaded = await uploadRes.json();
  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

/* ───────────────── ROUTE ───────────────── */

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { blogId } = await req.json();
    if (!blogId) {
      return NextResponse.json({ error: "Blog ID required" }, { status: 400 });
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || blog.status !== "pending") {
      return NextResponse.json({ error: "Invalid blog" }, { status: 400 });
    }

    const user = await User.findOne({ email: blog.author.email }).select(
      "+strapi.password"
    );

    if (!user) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    /* STEP 1: LOGIN / REGISTER STRAPI USER (self-healing) */
    const { jwt } = await loginOrRegister(user);

    /* STEP 2: CONTENT + INLINE IMAGES */
    let content = blog.content || "";

    content = sanitizeHtmlDataSrc(content);

    if (Array.isArray(blog.inlineImages)) {
      for (const img of blog.inlineImages) {
        if (!img?.base64) continue;

        const filename = filenameFromBase64(img.base64, img.id);

        try {
          const uploaded = await uploadInlineImage(img.base64, filename, jwt);
          const url = extractFileUrl(uploaded);
          if (url) {
            content = content.split(img.placeholder).join(`![image](${url})`);
          }
        } catch (e) {
          console.error("Inline image upload failed:", e);
        }
      }
    }

    content = removeStrayMarkdownBase64(content);

    if (content.length > MAX_CONTENT_CHARS) {
      content = content.slice(0, MAX_CONTENT_CHARS);
    }

    /* STEP 3: RELATIONS + COVER */
    const categoryIds = await resolveCategoryIds(blog.categories || [], jwt);

    const coverId = await uploadCover(
      blog.coverImage,
      blog.coverImageName,
      jwt
    );

    /* STEP 4: CREATE BLOG IN STRAPI */
    const res = await fetch(`${STRAPI_URL}/api/blogs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
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

    if (!res.ok) {
      throw new Error(`Blog create failed: ${await res.text()}`);
    }

    const created = await res.json();

    /* STEP 5: UPDATE MONGO */
    blog.status = "published";
    blog.strapiId = created.data.id;
    blog.publishedAt = new Date();
    blog.adminNotes = undefined;
    blog.rejectedAt = undefined;
    blog.content = content;
    blog.inlineImages = []; // Clear base64 inline images after upload to Strapi
    await blog.save();

    return NextResponse.json({
      success: true,
      strapiId: blog.strapiId,
    });
  } catch (err: any) {
    console.error("❌ Approval error:", err);
    return NextResponse.json(
      { error: err.message || "Approval failed" },
      { status: 500 }
    );
  }
}
