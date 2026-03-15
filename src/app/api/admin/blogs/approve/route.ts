import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!;
const MAX_CONTENT_CHARS = 100_000;

/* ───────────────── HELPERS ───────────────── */

/*
 * Login to Strapi if credentials already exist in MongoDB.
 * Otherwise register once, store password in MongoDB, and reuse forever.
 */
async function loginOrRegister(
  user: any
): Promise<{ jwt: string }> {
  let password = user.strapi?.password;

  // Generate password only once
  if (!password) {
    password = crypto.randomBytes(24).toString("hex");
  }

  // Try login first
  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: user.email,
      password,
    }),
  });

  if (res.ok) {
    return res.json();
  }

  // If password already existed but login failed → hard error
  if (user.strapi?.password) {
    throw new Error("Stored Strapi credentials are invalid");
  }

  // Register new Strapi user
  res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      username: user.username,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strapi register failed: ${await res.text()}`);
  }

  const data = await res.json();

  // Persist Strapi credentials in MongoDB
  user.strapi = {
    userId: data.user?.id,
    password,
  };

  await user.save();

  return data;
}

/* Safety net for legacy base64 and stray HTML data src attributes */
function sanitizeHtmlDataSrc(content: string) {
  return content.replace(/src=["']data:[^"']+["']/g, "");
}

/* Remove any stray markdown images that still point to data: URIs */
function removeStrayMarkdownBase64(content: string) {
  return content.replace(/!\[([^\]]*)\]\((data:[^)]+)\)/g, "![image removed]");
}

async function resolveCategoryIds(slugs: string[], jwt: string) {
  const ids: number[] = [];

  for (const slug of slugs) {
    const res = await fetch(
      `${STRAPI_URL}/api/categories?filters[slug][$eq]=${encodeURIComponent(
        slug
      )}`,
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
  if (!url && fileObj.data?.attributes?.url)
    url = fileObj.data.attributes.url;

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

    /* STEP 1: LOGIN / REGISTER STRAPI USER */
    const { jwt } = await loginOrRegister(user);

    /* STEP 2: CONTENT + INLINE IMAGES */
    let content = blog.content || "";

    content = sanitizeHtmlDataSrc(content);

    if (Array.isArray(blog.inlineImages)) {
      for (const img of blog.inlineImages) {
        if (!img?.base64) continue;

        const filename = filenameFromBase64(img.base64, img.id);

        try {
          const uploaded = await uploadInlineImage(
            img.base64,
            filename,
            jwt
          );
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
