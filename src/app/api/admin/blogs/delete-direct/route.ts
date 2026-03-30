import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");

/* ───────────────── LOGIN OR REGISTER USER IN STRAPI ───────────────── */

async function loginOrRegister(user: any): Promise<{ jwt: string }> {
  let password = user.strapi?.password;

  if (!password) {
    password = crypto.randomBytes(24).toString("hex");
  }

  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });

  if (res.ok) {
    return res.json();
  }

  if (user.strapi?.password) {
    console.log("Stored Strapi password invalid. Regenerating account...");
    password = crypto.randomBytes(24).toString("hex");

    res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, username: user.username, password }),
    });

    if (!res.ok) {
      throw new Error(`Strapi register retry failed: ${await res.text()}`);
    }

    const data = await res.json();
    user.strapi = { userId: data.user?.id, password };
    await user.save();
    return data;
  }

  res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, username: user.username, password }),
  });

  if (!res.ok) {
    throw new Error(`Strapi register failed: ${await res.text()}`);
  }

  const data = await res.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  return data;
}

/* Extract filename from base64 data URL to find inline images in Strapi */
function filenameFromBase64(base64?: string, fallback = "image") {
  if (!base64) return `${fallback}.png`;

  const nameMatch = base64.match(/name=([^;]+);base64,/);
  if (nameMatch?.[1]) {
    try {
      return decodeURIComponent(nameMatch[1]);
    } catch {
      return nameMatch[1];
    }
  }

  const mimeMatch = base64.match(/^data:(image\/[^;]+);base64,/);
  const mime = mimeMatch?.[1] || "image/png";

  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };

  return `${fallback}.${extMap[mime] ?? "png"}`;
}

/* ───────────────── DELETE ROUTE ───────────────── */

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    const { blogId } = await req.json();

    if (!blogId) {
      return NextResponse.json({ error: "Blog ID required" }, { status: 400 });
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");

    if (!user) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const { jwt } = await loginOrRegister(user);

    /* ───────────────── FIND BLOG IN STRAPI USING SLUG ───────────────── */

    console.log("Searching Strapi blog with slug:", blog.slug);

    const findRes = await fetch(
      `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${blog.slug}&publicationState=preview&populate[cover][fields]=id,documentId`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );

    if (!findRes.ok) {
      return NextResponse.json(
        { error: "Failed to find blog in Strapi" },
        { status: 500 }
      );
    }

    const findData = await findRes.json();
    const entry = findData.data?.[0];

    if (entry) {
      const attrs = entry.attributes || entry;
      const documentId = entry.documentId;
      const numericId = entry.id;

      const cover = attrs.cover?.data || attrs.cover;
      let coverId = cover?.id || cover?.documentId;

      console.log("Deleting Strapi blog:", documentId || numericId);

      let deleteRes = await fetch(
        `${STRAPI_URL}/api/blogs/${documentId || numericId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${jwt}` } }
      );

      if (!deleteRes.ok && documentId) {
        deleteRes = await fetch(
          `${STRAPI_URL}/api/blogs/${numericId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${jwt}` } }
        );
      }

      if (!deleteRes.ok) {
        const text = await deleteRes.text();
        return NextResponse.json(
          { error: `Strapi deletion failed: ${text}` },
          { status: deleteRes.status }
        );
      }

      console.log("Strapi blog deleted");

      /* ───────────────── DELETE COVER IMAGE ───────────────── */

      // Fallback: search by coverImageName if cover ID wasn't returned
      if (!coverId && blog.coverImageName) {
        console.log(`Searching Media Library for filename: ${blog.coverImageName}`);
        const fileSearch = await fetch(
          `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(blog.coverImageName)}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (fileSearch.ok) {
          const filesData = await fileSearch.json();
          if (filesData?.length > 0) coverId = filesData[0].id;
        }
      }

      if (coverId) {
        console.log("Deleting cover image:", coverId);
        await fetch(`${STRAPI_URL}/api/upload/files/${coverId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${jwt}` },
        });
      }

      /* ───────────────── DELETE INLINE IMAGES ───────────────── */

      if (blog.inlineImages && Array.isArray(blog.inlineImages) && blog.inlineImages.length > 0) {
        console.log(`Attempting to delete ${blog.inlineImages.length} inline images...`);

        for (const img of blog.inlineImages) {
          // Derive the actual filename from base64 — same logic as approve-delete
          const filename = filenameFromBase64(img.base64, img.id);
          if (!filename) continue;

          const fileSearch = await fetch(
            `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(filename)}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );

          if (!fileSearch.ok) continue;

          const filesData = await fileSearch.json();

          if (filesData?.length > 0) {
            const inlineImageId = filesData[0].id;
            console.log("Deleting inline image:", filename);

            await fetch(`${STRAPI_URL}/api/upload/files/${inlineImageId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${jwt}` },
            });
          } else {
            console.warn(`Inline image not found in Strapi: ${filename}`);
          }
        }
      }
    } else {
      console.log("Blog not found in Strapi, skipping media delete");
    }

    /* ───────────────── DELETE FROM MONGODB ───────────────── */

    await Blog.findByIdAndDelete(blogId);

    return NextResponse.json({
      message: "Blog and media deleted from Strapi and MongoDB",
    });
  } catch (error: any) {
    console.error("Delete direct error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}