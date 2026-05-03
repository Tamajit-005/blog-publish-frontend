import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sendBlogEmail } from "@/lib/email";

function validateInlineImages(inlineImages: any): { ok: boolean; error?: string } {
  if (inlineImages === undefined || inlineImages === null) return { ok: true };
  if (!Array.isArray(inlineImages))
    return { ok: false, error: "inlineImages must be an array" };

  const MAX_INLINE = 20;
  if (inlineImages.length > MAX_INLINE)
    return { ok: false, error: `Maximum ${MAX_INLINE} inline images allowed` };

  for (const img of inlineImages) {
    if (!img || typeof img !== "object")
      return { ok: false, error: "Each inline image must be an object" };
    if (!img.id || typeof img.id !== "string")
      return { ok: false, error: "Each inline image must have an id" };
    if (!img.placeholder || typeof img.placeholder !== "string")
      return { ok: false, error: "Each inline image must have a placeholder" };
    if (!img.r2Key || typeof img.r2Key !== "string")
      return { ok: false, error: "Each inline image must have an r2Key" };
    if (!img.r2Url || typeof img.r2Url !== "string")
      return { ok: false, error: "Each inline image must have an r2Url" };
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkUserAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug,
      content,
      description,
      r2CoverKey,
      r2CoverUrl,
      coverImageName,
      categories,
      inlineImages,
    } = body;

    if (!title || !slug || !content || !description || !categories) {
      return NextResponse.json(
        { error: "Title, slug, content, description, and categories are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(categories) || categories.length === 0 || categories.length > 3) {
      return NextResponse.json({ error: "Please select 1-3 categories" }, { status: 400 });
    }

    if (title.length < 10 || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be between 10 and 200 characters" },
        { status: 400 }
      );
    }

    if (content.length < 100) {
      return NextResponse.json(
        { error: "Content must be at least 100 characters" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 300) {
      return NextResponse.json(
        { error: "Description must be between 10 and 300 characters" },
        { status: 400 }
      );
    }

    const validation = validateInlineImages(inlineImages);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await dbConnect();

    const normalizedSlug = slug.toLowerCase().trim();
    const slugExists = await Blog.findOne({ slug: normalizedSlug });
    if (slugExists) {
      return NextResponse.json({ error: "This slug is already taken." }, { status: 400 });
    }

    const blog = await Blog.create({
      title: title.trim(),
      slug: normalizedSlug,
      content: content.trim(),
      description: description.trim(),
      r2CoverKey: r2CoverKey || undefined,
      r2CoverUrl: r2CoverUrl || undefined,
      coverImageName: coverImageName || undefined,
      categories,
      inlineImages: Array.isArray(inlineImages) ? inlineImages : [],
      author: {
        auth0Id: auth.user.auth0Id,
        username: auth.user.username,
        email: auth.user.email,
      },
      status: "pending",
    });

    await sendBlogEmail({
      type: "blog_submitted",
      blogTitle: blog.title,
      authorName: auth.user.username,
      authorEmail: auth.user.email,
      blogId: blog._id.toString(),
      description: blog.description,
      submittedAt: blog.createdAt.toString(),
    });

    return NextResponse.json({
      message: "Blog submitted for admin review",
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        description: blog.description,
        status: blog.status,
      },
    });
  } catch (error: any) {
    console.error("Blog creation error:", error);
    return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
  }
}