import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");

async function loginOrRegister(user: any): Promise<{ jwt: string }> {
  let password = user.strapi?.password;
  if (!password) password = crypto.randomBytes(24).toString("hex");

  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: user.email, password }),
  });
  if (res.ok) return res.json();

  if (user.strapi?.password) {
    console.log("Stored Strapi password invalid. Regenerating account...");
    password = crypto.randomBytes(24).toString("hex");

    res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, username: user.username, password }),
    });
    if (!res.ok) throw new Error(`Strapi register retry failed: ${await res.text()}`);

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
  if (!res.ok) throw new Error(`Strapi register failed: ${await res.text()}`);

  const data = await res.json();
  user.strapi = { userId: data.user?.id, password };
  await user.save();
  return data;
}

function filenameFromBase64(base64?: string, fallback = "image") {
  if (!base64) return `${fallback}.png`;
  const nameMatch = base64.match(/name=([^;]+);base64,/);
  if (nameMatch?.[1]) {
    try { return decodeURIComponent(nameMatch[1]); } catch { return nameMatch[1]; }
  }
  const mimeMatch = base64.match(/^data:(image\/[^;]+);base64,/);
  const mime = mimeMatch?.[1] || "image/png";
  const extMap: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  };
  return `${fallback}.${extMap[mime] ?? "png"}`;
}

/**
 * Batch-delete multiple Strapi media files by their URLs.
 * 1 GET (filters[$in]) + N parallel DELETEs regardless of file count.
 */
async function deleteStrapiFilesByUrls(fileUrls: string[], jwt: string): Promise<void> {
  if (fileUrls.length === 0) return;

  const hashMap = new Map<string, string>();
  for (const fileUrl of fileUrls) {
    try {
      const urlPath = new URL(fileUrl).pathname;
      const fullFilename = urlPath.split("/").pop();
      if (!fullFilename) continue;
      hashMap.set(fullFilename.replace(/\.[^/.]+$/, ""), fileUrl);
    } catch {
      console.warn(`Skipping invalid URL: ${fileUrl}`);
    }
  }
  if (hashMap.size === 0) return;

  const hashParams = Array.from(hashMap.keys())
    .map((h, i) => `filters[hash][$in][${i}]=${encodeURIComponent(h)}`)
    .join("&");

  const searchRes = await fetch(`${STRAPI_URL}/api/upload/files?${hashParams}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!searchRes.ok) {
    console.warn("Batch file lookup failed:", searchRes.statusText);
    return;
  }

  const files: { id: number; hash: string }[] = await searchRes.json();
  if (!Array.isArray(files) || files.length === 0) return;

  await Promise.all(
    files.map((file) =>
      fetch(`${STRAPI_URL}/api/upload/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      })
        .then(() => console.log(`🗑️ Deleted Strapi file id=${file.id} (${file.hash})`))
        .catch((e) => console.warn(`Failed to delete file id=${file.id}:`, e))
    )
  );
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized)
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );

    const { blogId } = await req.json();
    if (!blogId)
      return NextResponse.json({ error: "Blog ID required" }, { status: 400 });

    await dbConnect();

    const blog = await Blog.findById(blogId);
    if (!blog)
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });

    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");
    if (!user)
      return NextResponse.json({ error: "Author not found" }, { status: 404 });

    const { jwt } = await loginOrRegister(user);

    // ← Use blog.strapiId directly if available — skips the slug search GET entirely.
    // Fallback to slug search only for blogs published before strapiId was stored,
    // or for draft/pending blogs that were never published to Strapi.
    let strapiDocId: string | undefined = blog.strapiId;
    let coverIdFromStrapi: number | undefined;

    if (strapiDocId) {
      console.log("Using stored strapiId:", strapiDocId);
    } else {
      console.log("No strapiId stored — searching Strapi by slug:", blog.slug);

      const findRes = await fetch(
        `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${blog.slug}&publicationState=preview&populate[cover][fields]=id`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      if (!findRes.ok) {
        console.warn("Strapi search failed — deleting MongoDB only.");
        await Blog.findByIdAndDelete(blogId);
        return NextResponse.json({ message: "Blog deleted (not found in Strapi)" });
      }

      const findData = await findRes.json();
      const entry = findData.data?.[0];

      if (!entry) {
        console.log("Blog not found in Strapi — deleting MongoDB only.");
        await Blog.findByIdAndDelete(blogId);
        return NextResponse.json({ message: "Blog deleted (not found in Strapi)" });
      }

      strapiDocId = entry.documentId ?? String(entry.id);
      const attrs = entry.attributes || entry;
      const cover = attrs.cover?.data || attrs.cover;
      coverIdFromStrapi = cover?.id;
    }

    // Delete the blog entry from Strapi
    console.log("Deleting Strapi blog:", strapiDocId);
    const deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return NextResponse.json(
        { error: `Strapi deletion failed: ${text}` },
        { status: deleteRes.status }
      );
    }

    console.log("Strapi blog deleted");

    // Collect all media URLs for batch deletion
    const urlsToDelete: string[] = [];
    const legacyInlineImages: any[] = []; // old docs without strapiUrl

    // Cover — prefer strapiCoverUrl, then Strapi-returned coverId
    if (blog.strapiCoverUrl) {
      urlsToDelete.push(blog.strapiCoverUrl);
    } else if (coverIdFromStrapi) {
      // Direct delete by ID — no hash search needed
      console.log("Deleting cover by Strapi id:", coverIdFromStrapi);
      await fetch(`${STRAPI_URL}/api/upload/files/${coverIdFromStrapi}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      }).catch((e) => console.warn("Cover delete failed:", e));
    } else if (blog.coverImageName) {
      // Last resort: search by filename
      const fileSearch = await fetch(
        `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(blog.coverImageName)}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (fileSearch.ok) {
        const filesData = await fileSearch.json();
        if (filesData?.length > 0) {
          await fetch(`${STRAPI_URL}/api/upload/files/${filesData[0].id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwt}` },
          });
          console.log("Deleted cover by filename search");
        }
      }
    }

    // Inline images
    for (const img of blog.inlineImages ?? []) {
      if (img.strapiUrl) {
        urlsToDelete.push(img.strapiUrl);
      } else {
        legacyInlineImages.push(img);
      }
    }

    // Batch delete all known-URL media
    await deleteStrapiFilesByUrls(urlsToDelete, jwt);

    // Fallback: old inline images without strapiUrl — individual filename search
    for (const img of legacyInlineImages) {
      const filename = filenameFromBase64(img.base64, img.id);
      if (!filename) continue;

      const fileSearch = await fetch(
        `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(filename)}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (!fileSearch.ok) continue;

      const filesData = await fileSearch.json();
      if (filesData?.length > 0) {
        console.log("Deleting legacy inline image:", filename);
        await fetch(`${STRAPI_URL}/api/upload/files/${filesData[0].id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${jwt}` },
        });
      } else {
        console.warn(`Inline image not found in Strapi: ${filename}`);
      }
    }

    await Blog.findByIdAndDelete(blogId);

    return NextResponse.json({ message: "Blog and media deleted from Strapi and MongoDB" });
  } catch (error: any) {
    console.error("Delete direct error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}