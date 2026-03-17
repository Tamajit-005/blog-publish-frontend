import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sendBlogEmail } from "@/lib/email";

const CANCELLATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(
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

    // Check if blog exists and belongs to the authenticated user
    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this blog" },
        { status: 403 }
      );
    }

    if (!blog.deletionRequested) {
      return NextResponse.json(
        { error: "No deletion request found for this blog" },
        { status: 400 }
      );
    }

    // Enforce 10-minute cancellation window
    if (!blog.deletionRequestedAt) {
      return NextResponse.json(
        { error: "Cancellation window has expired" },
        { status: 400 }
      );
    }

    const elapsed = Date.now() - new Date(blog.deletionRequestedAt).getTime();
    if (elapsed > CANCELLATION_WINDOW_MS) {
      return NextResponse.json(
        { error: "Cancellation window has expired. You cannot cancel this request anymore." },
        { status: 410 }
      );
    }

    // Cancel the deletion request
    blog.deletionRequested = false;
    blog.deletionRequestedAt = undefined;
    await blog.save();

    // Send deletion cancellation email
    await sendBlogEmail({
      type: "delete_cancelled",
      blogTitle: blog.title,
      authorName: blog.author.username,
      authorEmail: blog.author.email,
      blogId: blog._id.toString(),
      description: blog.description,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Deletion request cancelled successfully.",
      action: "cancelled",
    });
  } catch (error) {
    console.error("❌ Error cancelling deletion request:", error);
    return NextResponse.json(
      { error: "Failed to cancel deletion request" },
      { status: 500 }
    );
  }
}
