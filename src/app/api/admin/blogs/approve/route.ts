import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import crypto from "crypto";

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
    if (!strapiUrl) {
      return NextResponse.json(
        { error: "Strapi URL not configured" },
        { status: 500 }
      );
    }

    console.log("🔄 Publishing to Strapi:", blog.title);

    /* ──────────────────────────────────────────────
       STEP 1: FIND OR CREATE WRITER IN STRAPI
    ────────────────────────────────────────────── */

    let writerId: number | null = null;

    const findWriterResponse = await fetch(
      `${strapiUrl}/api/users?filters[username][$eq]=${encodeURIComponent(
        blog.author.username
      )}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (findWriterResponse.ok) {
      const writers = await findWriterResponse.json();
      if (Array.isArray(writers) && writers.length > 0) {
        writerId = writers[0].id;
      }
    }

    if (!writerId) {
      const createWriterResponse = await fetch(`${strapiUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: blog.author.username,
          email: blog.author.email,
          password: crypto.randomBytes(8).toString("hex").slice(0, 8),
        }),
      });

      if (!createWriterResponse.ok) {
        const err = await createWriterResponse.text();
        return NextResponse.json(
          { error: `Failed to create writer: ${err}` },
          { status: 500 }
        );
      }

      const writerData = await createWriterResponse.json();
      writerId = writerData.id ?? writerData.data?.id ?? null;
    }

    /* ──────────────────────────────────────────────
       STEP 2: FETCH CATEGORY (USE FIRST CATEGORY)
    ────────────────────────────────────────────── */

    let categoryId: number | null = null;
    const primaryCategory = blog.categories?.[0];

    if (primaryCategory) {
      const findCategoryResponse = await fetch(
        `${strapiUrl}/api/categories?filters[slug][$eq]=${encodeURIComponent(
          primaryCategory.toLowerCase()
        )}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (findCategoryResponse.ok) {
        const categories = await findCategoryResponse.json();
        if (categories.data?.length > 0) {
          categoryId = categories.data[0].id;
        }
      }
    }

    /* ──────────────────────────────────────────────
       STEP 3: PUBLISH BLOG TO STRAPI
    ────────────────────────────────────────────── */

    const strapiPayload: any = {
      data: {
        title: blog.title,
        slug: blog.slug,
        description:
          blog.description || blog.content.substring(0, 200),
        content: blog.content,
        cover: blog.coverImage || null,
      },
    };

    if (categoryId) {
      strapiPayload.data.category = categoryId;
    }

    if (writerId) {
      strapiPayload.data.writer = writerId;
    }

    const strapiResponse = await fetch(`${strapiUrl}/api/blogs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(strapiPayload),
    });

    if (!strapiResponse.ok) {
      const err = await strapiResponse.text();
      return NextResponse.json(
        { error: `Strapi publish failed: ${err}` },
        { status: 500 }
      );
    }

    const strapiData = await strapiResponse.json();
    const strapiId = strapiData.data?.id;

    /* ──────────────────────────────────────────────
       STEP 4: UPDATE MONGODB
    ────────────────────────────────────────────── */

    blog.status = "published";
    blog.strapiId = strapiId;
    blog.strapiWriterId = writerId ?? undefined;
    blog.publishedAt = new Date();
    blog.adminNotes = adminNotes || "";

    await blog.save();

    return NextResponse.json({
      message: "Blog approved and published to Strapi",
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        status: blog.status,
        strapiId: blog.strapiId,
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
