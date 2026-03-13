import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId, adminNotes } = await req.json();
    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isEditPending)
      return NextResponse.json({ error: "No pending edit found" }, { status: 404 });

    blog.isEditPending = false;
    blog.pendingEdit = undefined;
    blog.adminNotes = adminNotes || "Edit rejected by admin";
    blog.isEditRejected = true; // ✅ Mark so user sees rejection reason

    await blog.save();

    return NextResponse.json({ success: true, message: "Edit rejected successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to reject edit" }, { status: 500 });
  }
}
