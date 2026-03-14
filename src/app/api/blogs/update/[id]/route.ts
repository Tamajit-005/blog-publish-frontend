import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

function extractFilenameFromBase64(base64?: string): string | undefined {
  if (!base64 || !base64.startsWith("data:image/")) return undefined;
  const commaIndex = base64.indexOf(",");
  if (commaIndex === -1) return undefined;
  const header = base64.slice(0, Math.min(commaIndex, 512));
  const nameIndex = header.indexOf("name=");
  if (nameIndex !== -1) {
    const start = nameIndex + 5;
    const end = header.indexOf(";", start);
    if (end !== -1) return decodeURIComponent(header.slice(start, end));
  }
  return "cover.jpg";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkUserAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, slug, content, description, coverImage, categories, inlineImages } = body;

    await dbConnect();

    const blog = await Blog.findById(id);
    if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json({ error: "Not your blog" }, { status: 403 });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const slugExists = await Blog.findOne({ slug: normalizedSlug, _id: { $ne: id } });
    if (slugExists) return NextResponse.json({ error: "Slug already taken" }, { status: 400 });

    if (blog.status === "published" || blog.status === "approved") {
      // For pending edit: store coverImage as-is so approve-edit can interpret it
      // "" = user removed cover, base64 = new upload, URL = unchanged existing
      let pendingCoverImageName: string | undefined;
      if (coverImage === "") {
        pendingCoverImageName = undefined; // removing cover, no name needed
      } else if (coverImage?.startsWith("data:")) {
        pendingCoverImageName = extractFilenameFromBase64(coverImage) || "cover.jpg";
      } else {
        pendingCoverImageName = blog.coverImageName; // existing URL, keep existing name
      }

      blog.isEditPending = true;
      blog.pendingEdit = {
        title: title.trim(),
        slug: normalizedSlug,
        content: content.trim(),
        description: description.trim(),
        coverImage: coverImage,  // store as-is for approve-edit logic
        coverImageName: pendingCoverImageName,
        categories,
        inlineImages: Array.isArray(inlineImages) ? inlineImages : (blog.inlineImages ?? []),
      };
      blog.isEditRejected = false;
      blog.adminNotes = undefined;
      await blog.save();

      return NextResponse.json({ message: "Edit submitted for admin review", isEditPending: true });
    } else {
      // Directly update if not published/approved, no pending state needed
      blog.title = title.trim();
      blog.slug = normalizedSlug;
      blog.content = content.trim();
      blog.description = description.trim();
      blog.categories = categories;
      blog.inlineImages = Array.isArray(inlineImages) ? inlineImages : (blog.inlineImages ?? []);

      if (coverImage === "") {
        // User explicitly removed the cover image
        blog.coverImage = undefined;
        blog.coverImageName = undefined;
      } else if (coverImage) {
        blog.coverImage = coverImage.trim();
        blog.coverImageName = extractFilenameFromBase64(coverImage) || blog.coverImageName;
      }
      // if coverImage is undefined (shouldn't happen), keep existing

      if (blog.status === "rejected") blog.status = "pending";
      await blog.save();

      return NextResponse.json({ message: "Blog updated successfully", isEditPending: false });
    }
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
  }
}
