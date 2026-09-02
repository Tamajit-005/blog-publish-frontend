import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sanityClient } from "@/lib/sanity";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });

    const { blogId } = await req.json();
    if (!blogId) return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    // Delete Sanity post if published
    const sanityId: string | undefined = (blog as any).sanityId;
    if (sanityId) {
      try {
        await sanityClient.delete(sanityId);
        console.log("Sanity post deleted:", sanityId);
      } catch (e: any) {
        if (e?.statusCode === 404) console.warn("Sanity post already deleted:", sanityId);
        else throw e;
      }

      // Best-effort: delete associated image assets
      const assetIds: string[] = [];
      if ((blog as any).sanityCoverAssetId) assetIds.push((blog as any).sanityCoverAssetId);
      for (const img of (blog as any).inlineImages ?? []) {
        if (img?.sanityAssetId) assetIds.push(img.sanityAssetId);
      }
      for (const aid of assetIds) {
        sanityClient.delete(aid).catch((err) => console.warn("Asset delete failed", aid, err?.message));
      }
    } else {
      console.warn("⚠️ No sanityId — cleaning MongoDB only.");
    }

    await Blog.findByIdAndDelete(blogId);
    return NextResponse.json({ message: "Blog permanently deleted" });
  } catch (error: any) {
    console.error("❌ Error approving delete:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
