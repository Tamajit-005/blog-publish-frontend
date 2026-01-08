import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();

    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    const { blogId, adminNotes } = await req.json();

    if (!blogId) {
      return NextResponse.json(
        { error: "Blog ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    if (blog.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending blogs can be approved" },
        { status: 400 }
      );
    }

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    console.log("🔄 Publishing to Strapi:", blog.title);
    console.log("🔵 Blog slug:", blog.slug);

    // Step 1: Find or create Writer (User) in Strapi
    console.log("🔵 Step 1: Finding/creating writer in Strapi...");

    let writerId: number | null = null;

    const findWriterResponse = await fetch(
      `${strapiUrl}/api/users?filters[username][$eq]=${blog.author.username}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (findWriterResponse.ok) {
      const existingWriters = await findWriterResponse.json();
      if (existingWriters.length > 0) {
        writerId = existingWriters[0].id;
        console.log("✅ Found existing writer in Strapi:", writerId);
      }
    }

    if (!writerId) {
      console.log("🔵 Creating new writer in Strapi...");
      const createWriterResponse = await fetch(`${strapiUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: blog.author.username,
          email: blog.author.email,
          password: Math.random().toString(36).slice(-8),
        }),
      });

      if (createWriterResponse.ok) {
        const writerData = await createWriterResponse.json();
        writerId = writerData.id || writerData.data?.id;
        console.log("✅ Created new writer in Strapi:", writerId);
      } else {
        const errorText = await createWriterResponse.text();
        console.error("❌ Failed to create writer:", errorText);
      }
    }

    // Step 2: Get Category ID from Strapi
    console.log("🔵 Step 2: Fetching category from Strapi...");

    let categoryId: number | null = null;

    const findCategoryResponse = await fetch(
      `${strapiUrl}/api/categories?filters[slug][$eq]=${blog.category.toLowerCase()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (findCategoryResponse.ok) {
      const categories = await findCategoryResponse.json();
      if (categories.data && categories.data.length > 0) {
        categoryId = categories.data[0].id;
        console.log("✅ Found category in Strapi:", categoryId);
      } else {
        console.warn(
          "⚠️  Category not found in Strapi, proceeding without category"
        );
      }
    }

    // Step 3: Publish Blog to Strapi
    console.log("🔵 Step 3: Publishing blog to Strapi...");

    const strapiPayload: any = {
      data: {
        title: blog.title,
        slug: blog.slug,
        description: blog.description || blog.content.substring(0, 200),
        content: blog.content,
        cover: blog.coverImage || null,
        heading: blog.heading || "H1",
      },
    };

    if (categoryId) {
      strapiPayload.data.category = categoryId;
    }

    if (writerId) {
      strapiPayload.data.writer = writerId;
    }

    console.log("📤 Payload:", JSON.stringify(strapiPayload, null, 2));

    const strapiResponse = await fetch(`${strapiUrl}/api/blogs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(strapiPayload),
    });

    const responseText = await strapiResponse.text();
    console.log("📥 Strapi status:", strapiResponse.status);
    console.log("📥 Strapi response:", responseText);

    if (!strapiResponse.ok) {
      console.error("❌ Strapi error:", responseText);
      return NextResponse.json(
        { error: `Strapi error: ${responseText}` },
        { status: 500 }
      );
    }

    const strapiData = JSON.parse(responseText);
    const strapiId = strapiData.data?.id;

    console.log("✅ Published to Strapi with ID:", strapiId);

    // Step 4: Update MongoDB
    blog.status = "published";
    blog.strapiId = strapiId;
    blog.strapiWriterId = writerId || undefined;
    blog.publishedAt = new Date();
    blog.adminNotes = adminNotes || "";
    await blog.save();

    console.log(`✅ Blog approved: ${blog.title}`);

    return NextResponse.json({
      message: "Blog approved and published to Strapi",
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        status: blog.status,
        strapiId: blog.strapiId,
        strapiWriterId: blog.strapiWriterId,
      },
    });
  } catch (error: any) {
    console.error("❌ Approval error:", error);
    return NextResponse.json(
      { error: `Failed to approve blog: ${error.message}` },
      { status: 500 }
    );
  }
}
