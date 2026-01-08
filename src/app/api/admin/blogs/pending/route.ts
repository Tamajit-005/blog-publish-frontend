import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    await dbConnect();

    const pendingBlogs = await Blog.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .select("title slug description categories coverImage author status createdAt")
      .lean();

    return NextResponse.json({
      blogs: pendingBlogs,
      count: pendingBlogs.length,
    });
  } catch (error) {
    console.error("❌ Error fetching pending blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending blogs" },
      { status: 500 }
    );
  }
}
