import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { blogId, reason } = await req.json();

    if (!blogId) {
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    if (!blog.deletionRequested) {
      return NextResponse.json({ error: "No deletion request found" }, { status: 400 });
    }

    // Clear the deletion request and mark as rejected with reason
    blog.deletionRequested = false;
    blog.isDeletionRejected = true;
    blog.deletionRejectedNotes = reason || "Deletion request rejected by admin";

    await blog.save();

    return NextResponse.json({
      success: true,
      message: "Deletion request rejected successfully",
    });
  } catch (error) {
    console.error("❌ Error rejecting deletion:", error);
    return NextResponse.json(
      { error: "Failed to reject deletion request" },
      { status: 500 }
    );
  }
}
