import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";


const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");


/* ───────────────── HELPERS ───────────────── */


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


  if (res.ok) return res.json();


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
  user.strapi = { userId: data.user?.id, password };
  await user.save();


  return data;
}


async function deleteStrapiFileByUrl(fileUrl: string, jwt: string): Promise<void> {
  try {
    const urlPath = new URL(fileUrl).pathname;
    const fullFilename = urlPath.split("/").pop();
    if (!fullFilename) return;


    const hash = fullFilename.replace(/\.[^/.]+$/, "");


    const searchRes = await fetch(
      `${STRAPI_URL}/api/upload/files?filters[hash][$eq]=${encodeURIComponent(hash)}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    if (!searchRes.ok) return;


    const files = await searchRes.json();
    if (!Array.isArray(files) || files.length === 0) return;


    await fetch(`${STRAPI_URL}/api/upload/files/${files[0].id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });


    console.log(`🗑️ Deleted Strapi file: ${fullFilename}`);
  } catch (e) {
    console.warn(`Failed to delete Strapi file by URL "${fileUrl}":`, e);
  }
}


async function deleteStrapiFileByName(filename: string, jwt: string): Promise<void> {
  try {
    const searchRes = await fetch(
      `${STRAPI_URL}/api/upload/files?filters[name][$eq]=${encodeURIComponent(filename)}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    if (!searchRes.ok) return;


    const files = await searchRes.json();
    if (!Array.isArray(files) || files.length === 0) {
      console.warn(`Inline image not found in Strapi: ${filename}`);
      return;
    }


    await fetch(`${STRAPI_URL}/api/upload/files/${files[0].id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });


    console.log(`🗑️ Deleted Strapi inline image: ${filename}`);
  } catch (e) {
    console.warn(`Failed to delete Strapi file by name "${filename}":`, e);
  }
}


// Batch fetch all file URLs in one $in query, then delete each
async function deleteStrapiFilesByUrls(fileUrls: string[], jwt: string): Promise<void> {
  try {
    const hashes: string[] = [];
    const filenameMap: Record<string, string> = {}; // hash → fullFilename (for logging)

    for (const fileUrl of fileUrls) {
      try {
        const urlPath = new URL(fileUrl).pathname;
        const fullFilename = urlPath.split("/").pop();
        if (!fullFilename) continue;
        const hash = fullFilename.replace(/\.[^/.]+$/, "");
        hashes.push(hash);
        filenameMap[hash] = fullFilename;
      } catch {
        console.warn(`Skipping invalid URL: ${fileUrl}`);
      }
    }

    if (hashes.length === 0) return;

    // 1 API call to fetch all files by hash
    const query = hashes
      .map((h, i) => `filters[hash][$in][${i}]=${encodeURIComponent(h)}`)
      .join("&");

    const searchRes = await fetch(`${STRAPI_URL}/api/upload/files?${query}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!searchRes.ok) return;

    const files = await searchRes.json();
    if (!Array.isArray(files) || files.length === 0) return;

    // Delete each file individually (Strapi has no batch delete)
    await Promise.all(
      files.map(async (file: any) => {
        await fetch(`${STRAPI_URL}/api/upload/files/${file.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${jwt}` },
        });
        console.log(`🗑️ Deleted Strapi file: ${filenameMap[file.hash] ?? file.id}`);
      })
    );
  } catch (e) {
    console.warn(`Failed to batch delete Strapi files:`, e);
  }
}


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


/* ───────────────── ROUTE ───────────────── */


export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }


    await dbConnect();


    const blog = await Blog.findById(blogId);


    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }


    const user = await User.findOne({ email: blog.author.email }).select("+strapi.password");


    if (!user) {
      return NextResponse.json(
        { error: "Author not found in database. Cannot authenticate with Strapi." },
        { status: 404 }
      );
    }


    const { jwt } = await loginOrRegister(user);


    let imageWarning = null;


    if (STRAPI_URL && jwt) {
      const strapiDocId = blog.strapiId;


      if (!strapiDocId) {
        console.warn("⚠️ No strapiId on blog — skipping Strapi deletion, cleaning MongoDB only.");
      } else {
        console.log(`Attempting to delete Strapi Blog (Doc ID: ${strapiDocId})`);


        // STEP B: Delete the Blog Entry
        const deleteRes = await fetch(`${STRAPI_URL}/api/blogs/${strapiDocId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${jwt}` },
        });


        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return NextResponse.json(
            {
              error: `Strapi deletion blocked: ${errData?.error?.message || deleteRes.statusText}. Please ensure the 'Authenticated' role in Strapi has 'destroy' permissions.`,
            },
            { status: deleteRes.status }
          );
        }


        console.log("Strapi Blog deleted successfully.");


        // STEP C: Delete Associated Images
        const urlsToDelete: string[] = [];

        if (blog.strapiCoverUrl) {
          urlsToDelete.push(blog.strapiCoverUrl);
        } else {
          console.warn("⚠️ No strapiCoverUrl stored — cover image not deleted from Strapi.");
        }

        if (Array.isArray(blog.inlineImages) && blog.inlineImages.length > 0) {
          for (const img of blog.inlineImages) {
            if (img.strapiUrl) {
              urlsToDelete.push(img.strapiUrl);
            } else {
              // fallback: inline image has no strapiUrl, delete by name individually
              const filename = filenameFromBase64(img.base64, img.id);
              if (filename) await deleteStrapiFileByName(filename, jwt);
            }
          }
        }

        if (urlsToDelete.length > 0) {
          try {
            await deleteStrapiFilesByUrls(urlsToDelete, jwt);
          } catch (e) {
            imageWarning = `Blog deleted, but some image deletions failed.`;
            console.warn(imageWarning, e);
          }
        }
      }
    }


    // MONGODB DELETION
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