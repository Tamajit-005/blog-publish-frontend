import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const blogs = await Blog.find({ isEditPending: true }).sort({ updatedAt: -1 }).lean();
    
    return NextResponse.json({ blogs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch edit requests" }, { status: 500 });
  }
}