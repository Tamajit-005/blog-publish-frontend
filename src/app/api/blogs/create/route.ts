import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";

/* ───────────────── HELPERS ───────────────── */

// Extract filename from base64 data URL if present
function extractFilenameFromBase64(base64?: string): string | undefined {
  if (!base64) return undefined;

  // Look for injected filename in data URL
  const match = base64.match(/name=([^;]+);base64,/);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  // Fallback based on MIME
  if (base64.startsWith("data:image/png")) return "cover.png";
  if (base64.startsWith("data:image/jpeg")) return "cover.jpg";
  if (base64.startsWith("data:image/webp")) return "cover.webp";

  return "cover.jpg";
}

/* Basic server-side validation for inline images */
function validateInlineImages(inlineImages: any): { ok: boolean; error?: string } {
  if (inlineImages === undefined || inlineImages === null) return { ok: true };

  if (!Array.isArray(inlineImages)) {
    return { ok: false, error: "inlineImages must be an array" };
  }

  // limit count (defensive)
  const MAX_INLINE = 20;
  if (inlineImages.length > MAX_INLINE) {
    return { ok: false, error: `Maximum ${MAX_INLINE} inline images allowed` };
  }

  for (const img of inlineImages) {
    if (!img || typeof img !== "object") return { ok: false, error: "Each inline image must be an object" };
    if (!img.id || typeof img.id !== "string") return { ok: false, error: "Each inline image must have an id string" };
    if (!img.placeholder || typeof img.placeholder !== "string") return { ok: false, error: "Each inline image must have a placeholder string" };
    if (!img.base64 || typeof img.base64 !== "string") return { ok: false, error: "Each inline image must have a base64 string" };
    if (!img.base64.startsWith("data:image/")) return { ok: false, error: "Inline image base64 must be a data URI starting with data:image/" };
    // Optionally, verify reasonable size by checking length (e.g. not larger than ~5MB)
    const approxBytes = Math.ceil((img.base64.length - img.base64.indexOf(",") - 1) * 3 / 4);
    const MAX_BYTES = 5 * 1024 * 1024;
    if (approxBytes > MAX_BYTES) return { ok: false, error: "Inline image too large" };
  }

  return { ok: true };
}

/* ───────────────── ROUTE ───────────────── */

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

    const {
      title,
      slug,
      content,
      description,
      coverImage,
      categories,
      inlineImages,
    } = body;

    /* ───── Validation ───── */

    if (!title || !slug || !content || !description || !categories) {
      return NextResponse.json(
        {
          error:
            "Title, slug, content, description, and categories are required",
        },
        { status: 400 }
      );
    }

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

    // Validate inline images (defensive)
    const validation = validateInlineImages(inlineImages);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    /* ───── DB ───── */

    await dbConnect();
    console.log("✅ Connected to MongoDB");

    const normalizedSlug = slug.toLowerCase().trim();

    const slugExists = await Blog.findOne({ slug: normalizedSlug });
    if (slugExists) {
      return NextResponse.json(
        { error: "This slug is already taken. Please choose another." },
        { status: 400 }
      );
    }

    /* ───── Cover filename extraction ───── */

    const coverImageName = extractFilenameFromBase64(coverImage);

    /* ───── Create blog ───── */

    const blog = await Blog.create({
      title: title.trim(),
      slug: normalizedSlug,
      content: content.trim(),
      description: description.trim(),

      coverImage: coverImage?.trim() || undefined,
      coverImageName, // store original filename

      categories,
      inlineImages: Array.isArray(inlineImages) ? inlineImages : [], // INLINE IMAGES STORED SEPARATELY

      author: {
        auth0Id: auth.user.auth0Id,
        username: auth.user.username,
        email: auth.user.email,
      },

      status: "pending",
    });

    console.log("✅ Blog created successfully:", blog._id);

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
    console.error("❌ Blog creation error:", error);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
