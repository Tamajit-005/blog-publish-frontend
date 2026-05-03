import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { bulkDeleteFromR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    const { blogId, adminNotes } = await req.json();

    if (!blogId || !adminNotes) {
      return NextResponse.json(
        { error: "Blog ID and rejection reason are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog)
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    // New blog rejection: all root blog R2 assets are temporary and can be deleted
    const r2KeysToDelete = Array.from(
      new Set([
        ...(blog.r2CoverKey ? [blog.r2CoverKey] : []),
        ...((blog.inlineImages ?? []).map((img: any) => img.r2Key).filter(Boolean)),
      ])
    );

    blog.status = "rejected";
    blog.rejectedAt = new Date();
    blog.adminNotes = adminNotes;
    blog.r2CoverKey = undefined;

    if (blog.inlineImages) {
      blog.inlineImages = blog.inlineImages.map((img: any) => ({
        ...img,
        r2Key: undefined,
      }));
    }

    await blog.save();

    if (r2KeysToDelete.length > 0) {
      bulkDeleteFromR2(r2KeysToDelete).catch((err) =>
        console.error("R2 cleanup failed after blog rejection:", err)
      );
    }

    console.log(`✅ Blog rejected: ${blog.title}`);

    return NextResponse.json({
      message: "Blog rejected",
      blog: { id: blog._id, title: blog.title, status: blog.status },
    });
  } catch (error) {
    console.error("❌ Rejection error:", error);
    return NextResponse.json({ error: "Failed to reject blog" }, { status: 500 });
  }
}