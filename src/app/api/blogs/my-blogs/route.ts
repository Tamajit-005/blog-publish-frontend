import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkUserAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    await dbConnect();

    const blogs = await Blog.find({ "author.auth0Id": auth.user.auth0Id })
      .sort({ createdAt: -1 })
      .select("title slug description categories coverImage status adminNotes createdAt updatedAt")
      .lean();

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("❌ Error fetching user blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}
