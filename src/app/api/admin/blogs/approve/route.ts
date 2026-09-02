import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sanityClient } from "@/lib/sanity";
import { findOrCreateAuthor, resolveCategoryRefs, uploadSanityImage } from "@/lib/sanityHelpers";
import { markdownToBlocks } from "@/lib/markdownToBlocks";

const MAX_CONTENT_CHARS = 100_000;

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

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId } = await req.json();
    if (!blogId) return NextResponse.json({ error: "Blog ID required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || blog.status !== "pending") return NextResponse.json({ error: "Invalid blog" }, { status: 400 });

    // STEP 1 — Author (Sanity author is the writer via auth0Id)
    const authorRef = await findOrCreateAuthor(blog.author);

    // STEP 2 — Upload cover + inline images to Sanity
    let coverAssetId: string | null = null;
    let coverAssetUrl: string | null = null;
    const inlineAssetMap = new Map<string, string>(); // placeholder -> assetId
    const savedInlineImages: any[] = [];

    // Cover
    if (blog.coverImage?.startsWith("data:")) {
      try {
        const filename = blog.coverImageName || filenameFromBase64(blog.coverImage, "cover");
        const { assetId, url } = await uploadSanityImage(blog.coverImage, filename);
        coverAssetId = assetId;
        coverAssetUrl = url;
      } catch (e) {
        console.error("Cover upload failed:", e);
        throw new Error(`Cover image upload failed: ${(e as any)?.message}`);
      }
    }

    // Inline images
    const inlineImages: any[] = blog.inlineImages ?? [];
    for (const img of inlineImages) {
      if (!img?.base64?.startsWith("data:")) {
        savedInlineImages.push(img);
        continue;
      }
      try {
        const filename = filenameFromBase64(img.base64, img.id);
        const { assetId, url } = await uploadSanityImage(img.base64, filename);
        inlineAssetMap.set(img.placeholder, assetId);
        // Also map full markdown pattern for robustness
        inlineAssetMap.set(`![${img.placeholder}](${img.placeholder})`, assetId);
        savedInlineImages.push({ ...img, sanityAssetId: assetId, sanityUrl: url });
      } catch (e) {
        console.error("Inline upload failed for", img.id, e);
        savedInlineImages.push(img);
      }
    }

    // STEP 3 — Build body (Portable Text blocks)
    let content = blog.content || "";
    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);
    const body = markdownToBlocks(content, inlineAssetMap);

    // STEP 4 — Categories → Sanity refs
    const categoryRefs = await resolveCategoryRefs(blog.categories || []);

    // STEP 5 — Handle slug conflict / existing sanityId
    let sanityId: string | null = blog.sanityId ?? null;
    if (sanityId) {
      console.warn(`⚠️ sanityId already set (${sanityId}) — skipping Sanity create.`);
    } else {
      // Check slug collision in Sanity
      const existing = await sanityClient.fetch(`*[_type=="post" && slug.current==$slug][0]._id`, { slug: blog.slug });
      if (existing) {
        throw new Error(`Slug "${blog.slug}" already exists in Sanity (doc ${existing}). Choose a different slug or delete the Sanity post first.`);
      }

      const doc: any = {
        _type: "post",
        title: blog.title,
        slug: { _type: "slug", current: blog.slug },
        description: blog.description || content.slice(0, 160),
        publishedAt: new Date().toISOString(),
        body,
        author: { _type: "reference", _ref: authorRef._id },
        categories: categoryRefs,
      };
      if (coverAssetId) {
        doc.image = { _type: "image", asset: { _type: "reference", _ref: coverAssetId }, alt: blog.title };
      }

      const created = await sanityClient.create(doc);
      sanityId = created._id;
    }

    // STEP 6 — Update MongoDB
    blog.status = "published";
    blog.sanityId = sanityId!;
    (blog as any).sanityCoverAssetId = coverAssetId || undefined;
    blog.publishedAt = new Date();
    blog.adminNotes = undefined;
    blog.rejectedAt = undefined;
    blog.inlineImages = savedInlineImages;
    await blog.save();

    return NextResponse.json({ success: true, sanityId: blog.sanityId, sanityCoverUrl: coverAssetUrl });
  } catch (err: any) {
    console.error("❌ Approval error:", err);
    return NextResponse.json({ error: err.message || "Approval failed" }, { status: 500 });
  }
}
