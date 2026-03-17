import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sendBlogEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkUserAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    await dbConnect();

    const { id } = await params;
    const blog = await Blog.findById(id).lean();

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json(
        { error: "You don't have permission to view this blog" },
        { status: 403 }
      );
    }

    return NextResponse.json({ blog });
  } catch (error) {
    console.error("❌ Error fetching blog:", error);
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkUserAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    await dbConnect();

    const { id } = await params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this blog" },
        { status: 403 }
      );
    }

    if (blog.status === "published" || blog.status === "approved") {
      blog.deletionRequested = true;
      blog.deletionRequestedAt = new Date(); // stamp the request time
      // Clear any previous rejection state when user re-requests deletion
      blog.isDeletionRejected = false;
      blog.deletionRejectedNotes = undefined;
      await blog.save();

      // Send email notification to admins about deletion request
      await sendBlogEmail({
        type: "delete_requested",
        blogTitle: blog.title,
        authorName: blog.author.username,
        authorEmail: blog.author.email,
        blogId: blog._id.toString(),
        description: blog.description,
        submittedAt: blog.deletionRequestedAt?.toString(),
      });

      return NextResponse.json({
        message: "Deletion requested successfully. Waiting for admin approval.",
        action: "requested",
        deletionRequestedAt: blog.deletionRequestedAt,
      });
    }

    await Blog.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Blog deleted successfully",
      action: "deleted",
    });
  } catch (error) {
    console.error("❌ Error deleting blog:", error);
    return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 });
  }
}
