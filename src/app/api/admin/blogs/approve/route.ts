import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";
import { getCachedJwt, setCachedJwt } from "@/lib/strapiJwtCache";
import { bulkR2ToStrapi } from "@/lib/r2-image-processor";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");
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
  if (!registerRes.ok)
    throw new Error(`Strapi register failed: ${await registerRes.text()}`);

  const data = await registerRes.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  setCachedJwt(user.email, data.jwt);
  return data.jwt;
}

function resolveCategoryIds(slugs: string[]): number[] {
  return slugs
    .map((slug) => FIXED_CATEGORIES.find((c) => c.slug === slug)?.id)
    .filter((id): id is number => id !== undefined);
}

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

function resolveR2Url(r2Url?: string | null, r2Key?: string | null): string | null {
  if (r2Url) return r2Url;
  if (r2Key && R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${r2Key}`;
  return null;
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

    const jwt = await loginOrRegister(user);

    const coverR2Key: string | undefined = blog.r2CoverKey;
    const coverR2Url: string | undefined = blog.r2CoverUrl;
    const inlineImages: any[] = blog.inlineImages ?? [];

    type UploadSlot = { r2Key: string; filename: string };
    const uploadBatch: UploadSlot[] = [];

    if (coverR2Key) {
      uploadBatch.push({
        r2Key: coverR2Key,
        filename: blog.coverImageName ?? `cover.${coverR2Key.split(".").pop() ?? "jpg"}`,
      });
    }

    const inlineSlots: { img: any; batchIndex: number }[] = [];
    for (const img of inlineImages) {
      if (img.r2Key && !img.strapiUrl) {
        inlineSlots.push({ img, batchIndex: uploadBatch.length });
        uploadBatch.push({
          r2Key: img.r2Key,
          filename: `inline-${img.id}.${img.r2Key.split(".").pop() ?? "jpg"}`,
        });
      }
    }

    const uploadResults = await bulkR2ToStrapi(uploadBatch);

    let coverId: number | null = null;
    let strapiCoverUrl: string | null = null;
    if (coverR2Key) {
      coverId = uploadResults[0].strapiId;
      strapiCoverUrl = uploadResults[0].strapiUrl;
    }

    const savedInlineImages: any[] = [];
    let strapiContent = blog.content || "";

    for (const img of inlineImages) {
      const slot = inlineSlots.find((s) => s.img === img);
      const strapiUrl = slot
        ? uploadResults[slot.batchIndex].strapiUrl
        : (img.strapiUrl ?? null);
      const strapiId = slot
        ? uploadResults[slot.batchIndex].strapiId
        : (img.strapiId ?? null);

      if (img.placeholder && strapiUrl) {
        // ROBUST REPLACEMENT: Escape the placeholder for safe Regex usage
        const escapedPlaceholder = img.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        
        strapiContent = strapiContent.replace(regex, `![image](${strapiUrl})`);

        savedInlineImages.push({
          ...img,
          strapiUrl,
          strapiId,
          r2Key: img.r2Key ?? null,
          r2Url: resolveR2Url(img.r2Url, img.r2Key),
        });
      } else {
        savedInlineImages.push(img);
      }
    }

    if (strapiContent.length > MAX_CONTENT_CHARS)
      strapiContent = strapiContent.slice(0, MAX_CONTENT_CHARS);

    const categoryIds = resolveCategoryIds(blog.categories || []);

    let strapiDocId: string | null = blog.strapiId ?? null;

    if (strapiDocId) {
      console.warn(`⚠️ strapiId already set (${strapiDocId}) — skipping Strapi create.`);
    } else {
      const createRes = await fetch(`${STRAPI_URL}/api/blogs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            title: blog.title,
            slug: blog.slug,
            description: blog.description || strapiContent.slice(0, 160),
            content: strapiContent,
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
          const searchRes = await fetch(
            `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${encodeURIComponent(blog.slug)}&fields[0]=id`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const existing = searchData?.data?.[0];
            strapiDocId = existing?.documentId ?? String(existing?.id) ?? null;
          }
        } else {
          throw new Error(`Blog create failed: ${JSON.stringify(errData)}`);
        }
      } else {
        const created = await createRes.json();
        strapiDocId = created.data.documentId ?? String(created.data.id);
      }
    }

    blog.status = "published";
    blog.strapiId = strapiDocId!;
    blog.publishedAt = new Date();
    blog.adminNotes = undefined;
    blog.rejectedAt = undefined;
    blog.inlineImages = savedInlineImages;
    blog.strapiCoverUrl = strapiCoverUrl ?? undefined;
    blog.strapiCoverId = coverId ?? undefined;
    blog.r2CoverKey = coverR2Key ?? undefined;
    blog.r2CoverUrl = resolveR2Url(coverR2Url, coverR2Key) ?? undefined;
    blog.coverImageName = blog.coverImageName;

    await blog.save();

    return NextResponse.json({ success: true, strapiId: blog.strapiId });
  } catch (err: any) {
    console.error("❌ Approval error:", err);
    return NextResponse.json({ error: err.message || "Approval failed" }, { status: 500 });
  }
}