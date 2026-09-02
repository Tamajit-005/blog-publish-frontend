import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sanityClient } from "@/lib/sanity";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });
    }

    const { blogId } = await req.json();
    if (!blogId) return NextResponse.json({ error: "Blog ID required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    // Try sanityId from Mongo first, fallback to slug lookup in Sanity
    let sanityId: string | undefined = (blog as any).sanityId;
    if (!sanityId) {
      const found: string | null = await sanityClient.fetch(`*[_type=="post" && slug.current==$slug][0]._id`, { slug: blog.slug }).catch(() => null);
      if (found) sanityId = found;
    }

    if (sanityId) {
      try {
        await sanityClient.delete(sanityId);
        console.log("Sanity post deleted:", sanityId);
      } catch (e: any) {
        if (e?.statusCode === 404) console.warn("Sanity post already gone:", sanityId);
        else console.warn("Sanity delete failed:", e?.message);
      }

      const assetIds: string[] = [];
      if ((blog as any).sanityCoverAssetId) assetIds.push((blog as any).sanityCoverAssetId);
      for (const img of (blog as any).inlineImages ?? []) {
        if (img?.sanityAssetId) assetIds.push(img.sanityAssetId);
      }
      // Also try to collect from live Sanity doc before delete (if we fetched it earlier)
      for (const aid of assetIds) {
        sanityClient.delete(aid).catch((err) => console.warn("Asset delete failed", aid, err?.message));
      }
    }

    await Blog.findByIdAndDelete(blogId);
    return NextResponse.json({ message: "Blog deleted successfully" });
  } catch (error: any) {
    console.error("Delete direct error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
