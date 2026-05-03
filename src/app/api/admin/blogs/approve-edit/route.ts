import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";
import { FIXED_CATEGORIES } from "@/lib/categories";
import { getCachedJwt, setCachedJwt } from "@/lib/strapiJwtCache";
import { bulkDeleteFromR2 } from "@/lib/r2";
import { bulkR2ToStrapi } from "@/lib/r2-image-processor";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");
const MAX_CONTENT_CHARS = 100000;
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

function resolveR2Url(r2Url?: string | null, r2Key?: string | null): string | null {
  if (r2Url) return r2Url;
  if (r2Key && R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${r2Key}`;
  return null;
}

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

function resolveCategoryIds(slugs: string[]): any[] {
  return slugs
    .map((slug) => {
      const cat = FIXED_CATEGORIES.find((c) => c.slug === slug);
      return cat ? (cat.documentId || cat.id) : undefined;
    })
    .filter((val) => val !== undefined);
}

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
  if (!searchRes.ok) return [];
  const files: { id: number; hash: string }[] = await searchRes.json();
  return Array.isArray(files) ? files : [];
}

async function deleteStrapiFiles(files: { id: number; hash: string }[], jwt: string): Promise<void> {
  if (files.length === 0) return;
  const ids = files.map((f) => f.id);
  await fetch(`${STRAPI_URL}/api/media/bulk-delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId } = await req.json();
    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isEditPending || !blog.pendingEdit)
      return NextResponse.json({ error: "No pending edit found" }, { status: 400 });

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");
    if (!user) return NextResponse.json({ error: "Author not found" }, { status: 404 });

    const jwt = await loginOrRegister(user);
    const edits = blog.pendingEdit;
    const r2KeysToDelete: string[] = [];

    const rawActiveImgs = (edits.inlineImages ?? []).filter(
      (img: any) => img?.placeholder && (edits.content || "").includes(img.placeholder)
    );

    const uploadBatch: { r2Key: string; filename: string }[] = [];
    if (edits.r2CoverKey) {
      uploadBatch.push({
        r2Key: edits.r2CoverKey,
        filename: edits.coverImageName ?? `cover.${edits.r2CoverKey.split(".").pop() ?? "jpg"}`,
      });
    }

    const inlineSlots: { img: any; batchIndex: number }[] = [];
    for (const img of rawActiveImgs) {
      if (img.r2Key && !img.strapiUrl) {
        inlineSlots.push({ img, batchIndex: uploadBatch.length });
        uploadBatch.push({
          r2Key: img.r2Key,
          filename: `inline-${img.id}.${img.r2Key.split(".").pop() ?? "jpg"}`,
        });
      }
    }

    let uploadResults: any[] = [];
    if (uploadBatch.length > 0) {
      uploadResults = await bulkR2ToStrapi(uploadBatch);
    }

    let resolvedCoverUrl: string | undefined = edits.strapiCoverUrl ?? undefined;
    let resolvedCoverId: number | undefined = undefined;
    if (edits.r2CoverKey) {
      resolvedCoverUrl = uploadResults[0]?.strapiUrl;
      resolvedCoverId = uploadResults[0]?.strapiId;
      r2KeysToDelete.push(edits.r2CoverKey);
    }

    // FIX: Explicitly assign fields rather than using the ...spread operator on Mongoose Documents
    const activeImgs: any[] = rawActiveImgs.map((doc: any) => {
      const slot = inlineSlots.find((s) => s.img === doc);
      if (slot) {
        if (doc.r2Key) r2KeysToDelete.push(doc.r2Key);
        return {
          id: doc.id,
          placeholder: doc.placeholder,
          r2Key: null,
          r2Url: null,
          strapiUrl: uploadResults[slot.batchIndex]?.strapiUrl,
          strapiId: uploadResults[slot.batchIndex]?.strapiId,
        };
      }
      return {
        id: doc.id,
        placeholder: doc.placeholder,
        r2Key: doc.r2Key ?? null,
        r2Url: doc.r2Url ?? null,
        strapiUrl: doc.strapiUrl ?? null,
        strapiId: doc.strapiId ?? null,
      };
    });

    const hadCover = !!blog.strapiCoverUrl;
    const editHasCover = !!resolvedCoverUrl;
    const coverRemoved = hadCover && !editHasCover;
    const coverChanged = editHasCover && resolvedCoverUrl !== blog.strapiCoverUrl;
    const oldCoverUrl = blog.strapiCoverUrl as string | undefined;

    if ((coverRemoved || coverChanged) && blog.r2CoverKey) r2KeysToDelete.push(blog.r2CoverKey);

    const keptInlineStrapiUrls = new Set<string>(activeImgs.map((img: any) => img.strapiUrl).filter(Boolean));
    const urlsToDelete: string[] = [];
    if ((coverRemoved || coverChanged) && oldCoverUrl) urlsToDelete.push(oldCoverUrl);

    const oldInlineStrapiUrls = new Set<string>((blog.inlineImages ?? []).map((img: any) => img.strapiUrl).filter(Boolean));
    for (const oldUrl of oldInlineStrapiUrls) {
      if (!keptInlineStrapiUrls.has(oldUrl)) urlsToDelete.push(oldUrl);
    }

    let strapiContent = sanitizeHtmlDataSrc(edits.content || "");
    let mongoContent = removeStrayMarkdownBase64(sanitizeHtmlDataSrc(edits.content || ""));

    for (const img of activeImgs) {
      const strapiUrl = img.strapiUrl;
      
      // Safety skip
      if (!strapiUrl || !img.placeholder) {
          console.warn("Skipping replacement: missing strapiUrl or placeholder", img.id);
          continue;
      }
      
      const escapedPlaceholder = img.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPlaceholder, 'g');

      strapiContent = strapiContent.replace(regex, `![image](${strapiUrl})`);

      const r2Url = resolveR2Url(img.r2Url, img.r2Key);
      const mongoImgUrl = r2Url ?? strapiUrl;
      mongoContent = mongoContent.replace(regex, `![image](${mongoImgUrl})`);
    }

    strapiContent = removeStrayMarkdownBase64(strapiContent);
    mongoContent = removeStrayMarkdownBase64(mongoContent);

    if (strapiContent.length > MAX_CONTENT_CHARS) strapiContent = strapiContent.slice(0, MAX_CONTENT_CHARS);

    const strapiDocId = blog.strapiId;
    const updatePayload: any = {
      title: edits.title,
      slug: edits.slug,
      description: edits.description,
      content: strapiContent,
      category: resolveCategoryIds(edits.categories ?? []),
    };

    if (coverChanged) updatePayload.cover = resolvedCoverId;
    else if (coverRemoved) updatePayload.cover = null;

    const [strapiUpdateRes, filesToDelete] = await Promise.all([
      fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatePayload }),
      }),
      lookupStrapiFileIds(urlsToDelete, jwt),
    ]);

    if (!strapiUpdateRes.ok) {
      const errText = await strapiUpdateRes.text();
      console.error("Strapi update rejected. Response text:", errText);
      throw new Error(`Strapi update failed: ${errText}`);
    }

    await deleteStrapiFiles(filesToDelete, jwt);

    blog.title = edits.title;
    blog.slug = edits.slug;
    blog.description = edits.description;
    blog.content = mongoContent;
    blog.categories = edits.categories;
    blog.inlineImages = activeImgs; // Now a clean Javascript array of plain objects

    if (coverRemoved || coverChanged) {
      blog.strapiCoverUrl = resolvedCoverUrl ?? undefined;
      blog.strapiCoverId = resolvedCoverId ?? undefined;
      blog.r2CoverKey = undefined;
      blog.r2CoverUrl = undefined;
      blog.coverImageName = undefined;
    }

    blog.isEditPending = false;
    blog.pendingEdit = undefined;
    await blog.save();

    const uniqueR2Keys = [...new Set(r2KeysToDelete.filter(Boolean))];
    if (uniqueR2Keys.length > 0) {
      bulkDeleteFromR2(uniqueR2Keys).catch((err) => console.error("R2 cleanup failed:", err));
    }

    return NextResponse.json({ success: true, message: "Edit approved" });
  } catch (err: any) {
    console.error("Approve-edit critical error:", err);
    return NextResponse.json({ error: err.message || "Approval failed" }, { status: 500 });
  }
}