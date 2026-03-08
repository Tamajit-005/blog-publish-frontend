import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");

/* ───────────────── HELPERS ───────────────── */

/**
 * Login to Strapi if credentials already exist in MongoDB.
 * Otherwise register once, store password in MongoDB, and reuse forever.
 */
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
    throw new Error("Stored Strapi credentials are invalid");
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

  user.strapi = {
    userId: data.user?.id,
    password,
  };

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

  const ext = extMap[mime] || "png";
  return `${fallback}.${ext}`;
}

/* ───────────────── ROUTE ───────────────── */

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 403 }
      );
    }

    const { blogId } = await req.json();

    if (!blogId) {
      return NextResponse.json(
        { error: "Blog ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // 2. Find the blog in MongoDB
    const blog = await Blog.findById(blogId);

    if (!blog) {
      return NextResponse.json(
        { error: "Blog not found" },
        { status: 404 }
      );
    }

    // 3. Find User in MongoDB to authenticate with Strapi
    const user = await User.findOne({ email: blog.author.email }).select(
      "+strapi.password"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Author not found in database. Cannot authenticate with Strapi." },
        { status: 404 }
      );
    }

    // 4. Authenticate with Strapi as the User to get the JWT
    const { jwt } = await loginOrRegister(user);
    
    let imageWarning = null;

    // ==========================================
    // STRAPI DELETION LOGIC
    // ==========================================
    if (STRAPI_URL && jwt) {
      console.log(`🔍 Searching for Strapi entry via Slug: ${blog.slug}`);

      // STEP A: Fetch the Strapi Entry using the Slug
      const findRes = await fetch(
        `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${blog.slug}&publicationState=preview&populate[cover][fields]=id,documentId`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      if (!findRes.ok) {
        const errData = await findRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Strapi search failed: ${errData?.error?.message || findRes.statusText}` },
          { status: 502 }
        );
      }

      const findData = await findRes.json();
      const strapiEntry = findData.data?.[0];

      if (strapiEntry) {
        const strapiDocumentId = strapiEntry.documentId;
        const strapiNumericId = strapiEntry.id;
        const attrs = strapiEntry.attributes || strapiEntry; 
        
        const cover = attrs.cover?.data || attrs.cover;
        let coverId = cover?.id || cover?.documentId; 

        console.log(`Attempting to delete Strapi Blog (Doc ID: ${strapiDocumentId || strapiNumericId})`);

        // STEP B: Delete the Blog Entry
        let deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocumentId || strapiNumericId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (!deleteRes.ok && strapiDocumentId) {
          deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiNumericId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwt}` },
          });
        }

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return NextResponse.json(
            { 
              error: `Strapi deletion blocked: ${errData?.error?.message || deleteRes.statusText}. Please ensure the 'Authenticated' role in Strapi has 'destroy' permissions.` 
            },
            { status: deleteRes.status }
          );
        }

        console.log("Strapi Blog deleted successfully.");

        // STEP C: Delete Cover Image
        if (!coverId && blog.coverImageName) {
          console.log(`Searching Media Library for filename: ${blog.coverImageName}`);
          const fileSearch = await fetch(`${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(blog.coverImageName)}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          if (fileSearch.ok) {
            const filesData = await fileSearch.json();
            if (filesData && filesData.length > 0) {
              coverId = filesData[0].id;
            }
          }
        }

        if (coverId) {
          console.log(`Deleting Strapi Cover Image ID: ${coverId}`);
          const imgDelete = await fetch(`${STRAPI_URL}/api/upload/files/${coverId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwt}` },
          });
          
          if(!imgDelete.ok) {
              const errData = await imgDelete.json().catch(() => ({}));
              imageWarning = `Blog deleted, but cover image deletion failed: ${errData?.error?.message || imgDelete.statusText}`;
              console.warn(`${imageWarning}`);
          } else {
              console.log("Strapi Cover Image deleted successfully.");
          }
        }

        // STEP D: Delete Inline Images
        if (blog.inlineImages && Array.isArray(blog.inlineImages) && blog.inlineImages.length > 0) {
          console.log(`Attempting to delete ${blog.inlineImages.length} inline images...`);
          
          for (const img of blog.inlineImages) {
            const filename = filenameFromBase64(img.base64, img.id);
            if (!filename) continue;

            // Search Strapi for this filename
            const fileSearch = await fetch(`${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(filename)}`, {
              headers: { Authorization: `Bearer ${jwt}` }
            });

            if (fileSearch.ok) {
              const filesData = await fileSearch.json();
              if (filesData && filesData.length > 0) {
                // Delete the matched file
                const inlineImageId = filesData[0].id;
                const imgDelete = await fetch(`${STRAPI_URL}/api/upload/files/${inlineImageId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${jwt}` }
                });

                if (!imgDelete.ok) {
                  console.warn(`Failed to delete inline image: ${filename}`);
                } else {
                  console.log(`Deleted inline image: ${filename}`);
                }
              } else {
                 console.warn(`Inline image not found in Strapi: ${filename}`);
              }
            }
          }
        }

      } else {
        console.warn("⚠️ Blog was not found in Strapi. Proceeding to clean up MongoDB.");
      }
    }

    // ==========================================
    // MONGODB DELETION
    // ==========================================
    // 4. Delete from MongoDB (ONLY REACHED IF STRAPI DELETION SUCCEEDED)
    await Blog.findByIdAndDelete(blogId);

    if (imageWarning) {
      return NextResponse.json({ error: imageWarning }, { status: 207 });
    }

    return NextResponse.json({ message: "Blog permanently deleted" });
  } catch (error: any) {
    console.error("❌ Error approving delete:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during deletion." },
      { status: 500 }
    );
  }
}