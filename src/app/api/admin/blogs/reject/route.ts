import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();

    // Type guard
    if (!auth.authorized || !auth.user) {
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

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    blog.status = "rejected";
    blog.rejectedAt = new Date();
    blog.adminNotes = adminNotes;
    await blog.save();

    console.log(`✅ Blog rejected: ${blog.title}`);

    return NextResponse.json({
      message: "Blog rejected",
      blog: {
        id: blog._id,
        title: blog.title,
        status: blog.status,
      },
    });
  } catch (error) {
    console.error("❌ Rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject blog" },
      { status: 500 }
    );
  }
}
