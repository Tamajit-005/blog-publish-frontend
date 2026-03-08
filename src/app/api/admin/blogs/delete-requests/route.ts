import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function GET() {
  try {
    // 1. Verify Admin
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    await dbConnect();

    // 2. Fetch blogs where deletion has been requested
    // Sort by updatedAt desc to see newest requests first
    const blogs = await Blog.find({ deletionRequested: true })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("❌ Error fetching deletion requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch deletion requests" },
      { status: 500 }
    );
  }
}