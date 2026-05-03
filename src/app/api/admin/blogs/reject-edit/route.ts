import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { bulkDeleteFromR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { blogId, adminNotes } = await req.json();
    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog || !blog.isEditPending)
      return NextResponse.json({ error: "No pending edit found" }, { status: 404 });

    // Edit rejection: only pendingEdit assets are temporary and should be deleted
    const r2KeysToDelete = Array.from(
      new Set([
        ...(blog.pendingEdit?.r2CoverKey ? [blog.pendingEdit.r2CoverKey] : []),
        ...((blog.pendingEdit?.inlineImages ?? []).map((img: any) => img.r2Key).filter(Boolean)),
      ])
    );

    blog.isEditPending = false;
    blog.pendingEdit = undefined;
    blog.adminNotes = adminNotes || "Edit rejected by admin";
    blog.isEditRejected = true;

    await blog.save();

    if (r2KeysToDelete.length > 0) {
      bulkDeleteFromR2(r2KeysToDelete).catch((err) =>
        console.error("R2 cleanup failed after edit rejection:", err)
      );
    }

    return NextResponse.json({ success: true, message: "Edit rejected successfully" });
  } catch (err) {
    console.error("Reject-edit error:", err);
    return NextResponse.json({ error: "Failed to reject edit" }, { status: 500 });
  }
}