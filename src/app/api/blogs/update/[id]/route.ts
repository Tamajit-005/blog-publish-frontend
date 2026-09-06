import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sendBlogEmail } from "@/lib/email";
import { convertToBase64WebP } from "@/lib/optimizeImage";

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
    let { title, slug, content, description, coverImage, categories, inlineImages, cardColor } = body;

    if (cardColor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(cardColor)) {
      return NextResponse.json({ error: "Invalid card colour" }, { status: 400 });
    }

    await dbConnect();
    const blog = await Blog.findById(id);
    if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json({ error: "Not your blog" }, { status: 403 });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const slugExists = await Blog.findOne({ slug: normalizedSlug, _id: { $ne: id } });
    if (slugExists) return NextResponse.json({ error: "Slug already taken" }, { status: 400 });

    /* ───── Optimization Logic ───── */
    const optimizedCover = await convertToBase64WebP(coverImage);
    
    let processedInline = blog.inlineImages || [];
    if (Array.isArray(inlineImages)) {
      // If inlineImages is sent in body (even as []), we use it to allow deletion
      processedInline = await Promise.all(
        inlineImages.map(async (img: any) => ({
          ...img,
          base64: img.base64.startsWith('data:') ? await convertToBase64WebP(img.base64) : img.base64
        }))
      );
    }

    if (blog.status === "published" || blog.status === "approved") {
      let pendingCoverImageName: string | undefined;
      if (coverImage === "") {
        pendingCoverImageName = undefined;
      } else if (coverImage?.startsWith("data:")) {
        pendingCoverImageName = extractFilenameFromBase64(coverImage) || "cover.jpg";
      } else {
        pendingCoverImageName = blog.coverImageName;
      }

      blog.isEditPending = true;
      blog.pendingEdit = {
        title: title.trim(),
        slug: normalizedSlug,
        content: content.trim(),
        description: description.trim(),
        coverImage: optimizedCover, 
        coverImageName: pendingCoverImageName,
        categories,
        inlineImages: processedInline,
      };
      blog.isEditRejected = false;
      blog.adminNotes = undefined;
      if (cardColor) blog.cardColor = cardColor;
      await blog.save();

      await sendBlogEmail({
        type: "edit_submitted",
        blogTitle: blog.title,
        authorName: auth.user.username,
        authorEmail: auth.user.email,
        blogId: blog._id.toString(),
        description: blog.pendingEdit?.description || blog.description,
        submittedAt: new Date().toISOString(),
      });

      return NextResponse.json({ message: "Edit submitted for admin review", isEditPending: true });
    } else {
      blog.title = title.trim();
      blog.slug = normalizedSlug;
      blog.content = content.trim();
      blog.description = description.trim();
      blog.categories = categories;
      blog.inlineImages = processedInline;
      if (cardColor) blog.cardColor = cardColor;

      if (coverImage === "") {
        blog.coverImage = undefined;
        blog.coverImageName = undefined;
      } else if (coverImage) {
        blog.coverImage = optimizedCover;
        blog.coverImageName = coverImage.startsWith("data:") ? extractFilenameFromBase64(coverImage) : blog.coverImageName;
      }

      if (blog.status === "rejected") blog.status = "pending";
      await blog.save();

      return NextResponse.json({ message: "Blog updated successfully", isEditPending: false });
    }
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
  }
}