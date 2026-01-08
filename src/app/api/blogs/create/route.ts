import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function POST(req: NextRequest) {
  try {
    console.log("🔵 Blog creation started...");

    const auth = await checkUserAuth();
    console.log("🔵 Auth check:", auth.authorized);

    if (!auth.authorized || !auth.user) {
      console.log("❌ Unauthorized:", auth.error);
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json();
    console.log("🔵 Request body received");

    const { title, slug, content, description, coverImage, categories } = body;

    // Validation
    if (!title || !slug || !content || !description || !categories) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "Title, slug, content, description, and categories are required" },
        { status: 400 }
      );
    }

    // ✅ Validate categories
    if (!Array.isArray(categories) || categories.length === 0 || categories.length > 3) {
      return NextResponse.json(
        { error: "Please select 1-3 categories" },
        { status: 400 }
      );
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

    console.log("🔵 Connecting to MongoDB...");
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    const slugExists = await Blog.findOne({ slug: slug.toLowerCase().trim() });
    if (slugExists) {
      return NextResponse.json(
        { error: "This slug is already taken. Please choose another." },
        { status: 400 }
      );
    }

    console.log("🔵 Using slug:", slug);

    // Create blog
    const blog = await Blog.create({
      title: title.trim(),
      slug: slug.toLowerCase().trim(),
      content: content.trim(),
      description: description.trim(),
      coverImage: coverImage?.trim() || undefined,
      categories: categories,
      author: {
        auth0Id: auth.user.auth0Id,
        username: auth.user.username,
        email: auth.user.email,
      },
      status: "pending",
    });

    console.log("✅ Blog created successfully!");
    console.log("🔵 Blog categories:", blog.categories);

    return NextResponse.json({
      message: "Blog submitted for review",
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        description: blog.description,
        status: blog.status,
      },
    });
  } catch (error: any) {
    console.error("❌ Blog creation error:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
