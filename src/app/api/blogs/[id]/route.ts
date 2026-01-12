import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

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
      return NextResponse.json(
        { error: "Blog not found" },
        { status: 404 }
      );
    }

    // ✅ Ensure user owns this blog
    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json(
        { error: "You don't have permission to view this blog" },
        { status: 403 }
      );
    }

    return NextResponse.json({ blog });
  } catch (error) {
    console.error("❌ Error fetching blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}
