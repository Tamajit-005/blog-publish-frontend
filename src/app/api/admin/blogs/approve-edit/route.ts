import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sanityClient } from "@/lib/sanity";
import { resolveCategoryRefs, uploadSanityImage } from "@/lib/sanityHelpers";
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
    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isEditPending || !blog.pendingEdit)
      return NextResponse.json({ error: "No pending edit found" }, { status: 400 });

    const edits: any = blog.pendingEdit;

    if (!blog.sanityId) throw new Error("No sanityId stored — cannot update blog in Sanity.");

    const needsNewCover = edits.coverImage != null && edits.coverImage !== "" && edits.coverImage.startsWith("data:");
    const coverRemoved = edits.coverImage === "" || edits.coverImage === null;

    const oldCoverAssetId: string | undefined = (blog as any).sanityCoverAssetId;

    let newCoverAssetId: string | null = null;
    if (needsNewCover) {
      const { assetId } = await uploadSanityImage(edits.coverImage, edits.coverImageName || filenameFromBase64(edits.coverImage, "cover"));
      newCoverAssetId = assetId;
    }

    const activeImgs: any[] = (edits.inlineImages ?? []).filter(
      (img: any) => img?.base64 && img?.placeholder && (edits.content || "").includes(img.placeholder)
    );
    const inlineAssetMap = new Map<string, string>();
    const activeInlineImages: any[] = [];

    for (const img of activeImgs) {
      if (img.sanityAssetId) {
        inlineAssetMap.set(img.placeholder, img.sanityAssetId);
        activeInlineImages.push(img);
        continue;
      }
      if (img.base64?.startsWith("data:")) {
        try {
          const { assetId, url } = await uploadSanityImage(img.base64, filenameFromBase64(img.base64, img.id));
          inlineAssetMap.set(img.placeholder, assetId);
          activeInlineImages.push({ ...img, sanityAssetId: assetId, sanityUrl: url });
        } catch (e) {
          console.error("Inline upload failed for", img.id, e);
          activeInlineImages.push(img);
        }
      } else {
        activeInlineImages.push(img);
      }
    }

    let content = edits.content || "";
    if (content.length > MAX_CONTENT_CHARS) content = content.slice(0, MAX_CONTENT_CHARS);
    const body = markdownToBlocks(content, inlineAssetMap);

    const categoryRefs = await resolveCategoryRefs(edits.categories ?? []);

    const patch: any = {
      title: edits.title,
      slug: { _type: "slug", current: edits.slug },
      description: edits.description,
      body,
      categories: categoryRefs,
    };
    if (newCoverAssetId) {
      patch.image = { _type: "image", asset: { _type: "reference", _ref: newCoverAssetId }, alt: edits.title };
    } else if (coverRemoved) {
      patch.image = null;
    }

    let sanityPatch = sanityClient.patch(blog.sanityId);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) sanityPatch = sanityPatch.unset([k]);
      else sanityPatch = sanityPatch.set({ [k]: v });
    }
    await sanityPatch.commit();

    if ((newCoverAssetId || coverRemoved) && oldCoverAssetId) {
      sanityClient.delete(oldCoverAssetId).catch((e) => console.warn("Old cover asset delete failed:", e));
    }

    blog.title = edits.title;
    blog.slug = edits.slug;
    blog.description = edits.description;
    blog.content = edits.content;
    blog.categories = edits.categories;
    blog.inlineImages = activeInlineImages;

    if (coverRemoved) {
      blog.coverImage = undefined;
      blog.coverImageName = undefined;
      (blog as any).sanityCoverAssetId = undefined;
    } else if (newCoverAssetId) {
      blog.coverImage = edits.coverImage;
      (blog as any).sanityCoverAssetId = newCoverAssetId;
      if (edits.coverImageName) blog.coverImageName = edits.coverImageName;
    }

    blog.isEditPending = false;
    blog.pendingEdit = undefined as any;
    blog.adminNotes = undefined;
    await blog.save();

    return NextResponse.json({ success: true, message: "Edit approved and published" });
  } catch (err: any) {
    console.error("Approve-edit error:", err);
    return NextResponse.json({ error: err.message ?? "Approval failed" }, { status: 500 });
  }
}
