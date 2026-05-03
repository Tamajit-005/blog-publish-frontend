import { NextRequest, NextResponse } from "next/server";
import { checkUserAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import { sendBlogEmail } from "@/lib/email";
import { bulkDeleteFromR2 } from "@/lib/r2";

function collectR2Keys(images: any[] = []): string[] {
  return Array.from(
    new Set(
      images
        .map((img: any) => img?.r2Key)
        .filter((v: any): v is string => typeof v === "string" && v.length > 0)
    )
  );
}

function collectRemovedR2Keys(
  oldImages: any[] = [],
  newImages: any[] = [],
  oldCoverKey?: string | null,
  newCoverKey?: string | null
): string[] {
  const removed: string[] = [];

  // Cover diff
  if (oldCoverKey && oldCoverKey !== newCoverKey) {
    removed.push(oldCoverKey);
  }

  // Inline diff
  const oldKeys = new Set(collectR2Keys(oldImages));
  const newKeys = new Set(collectR2Keys(newImages));
  for (const key of oldKeys) {
    if (!newKeys.has(key)) removed.push(key);
  }

  return [...new Set(removed)];
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
    const {
      title,
      slug,
      content,
      description,
      r2CoverKey,
      r2CoverUrl,
      coverImageName,
      strapiCoverUrl,
      categories,
      inlineImages,
    } = body;

    await dbConnect();

    const blog = await Blog.findById(id);
    if (!blog)
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    if (blog.author.auth0Id !== auth.user.auth0Id) {
      return NextResponse.json({ error: "Not your blog" }, { status: 403 });
    }

    const normalizedSlug = slug.toLowerCase().trim();
    const slugExists = await Blog.findOne({ slug: normalizedSlug, _id: { $ne: id } });
    if (slugExists)
      return NextResponse.json({ error: "Slug already taken" }, { status: 400 });

    if (blog.status === "published" || blog.status === "approved") {
      // Compare against existing pendingEdit if present, otherwise against live blog
      const previousSource = blog.pendingEdit ?? blog;

      const orphanedR2Keys = collectRemovedR2Keys(
        previousSource.inlineImages ?? [],
        Array.isArray(inlineImages) ? inlineImages : [],
        previousSource.r2CoverKey,
        r2CoverKey ?? null
      );

      blog.isEditPending = true;
      blog.pendingEdit = {
        title: title.trim(),
        slug: normalizedSlug,
        content: content.trim(),
        description: description.trim(),
        r2CoverKey: r2CoverKey ?? null,
        r2CoverUrl: r2CoverUrl ?? null,
        coverImageName: coverImageName || undefined,
        strapiCoverUrl: strapiCoverUrl ?? null,
        categories,
        inlineImages: Array.isArray(inlineImages) ? inlineImages : blog.inlineImages ?? [],
      };
      blog.isEditRejected = false;
      blog.adminNotes = undefined;

      await blog.save();

      // Fire-and-forget cleanup of replaced/removed pending assets
      if (orphanedR2Keys.length > 0) {
        bulkDeleteFromR2(orphanedR2Keys).catch((err) =>
          console.error("R2 cleanup failed on edit submit:", err)
        );
        console.log(`🗑️ Queued ${orphanedR2Keys.length} orphaned R2 key(s):`, orphanedR2Keys);
      }

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
      // Non-published: diff old live blog keys vs new keys and delete orphans
      const orphanedR2Keys = collectRemovedR2Keys(
        blog.inlineImages ?? [],
        Array.isArray(inlineImages) ? inlineImages : [],
        blog.r2CoverKey,
        r2CoverKey ?? null
      );

      blog.title = title.trim();
      blog.slug = normalizedSlug;
      blog.content = content.trim();
      blog.description = description.trim();
      blog.categories = categories;
      blog.inlineImages = Array.isArray(inlineImages) ? inlineImages : blog.inlineImages ?? [];
      blog.r2CoverKey = r2CoverKey ?? undefined;
      blog.r2CoverUrl = r2CoverUrl ?? undefined;
      blog.coverImageName = coverImageName || undefined;

      if (blog.status === "rejected") blog.status = "pending";

      await blog.save();

      if (orphanedR2Keys.length > 0) {
        bulkDeleteFromR2(orphanedR2Keys).catch((err) =>
          console.error("R2 cleanup failed on direct edit:", err)
        );
        console.log(`🗑️ Queued ${orphanedR2Keys.length} orphaned R2 key(s):`, orphanedR2Keys);
      }

      return NextResponse.json({ message: "Blog updated successfully", isEditPending: false });
    }
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
  }
}