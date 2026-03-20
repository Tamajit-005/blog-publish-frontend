import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all blogs, sorted by creation date (newest first)
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);

    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}