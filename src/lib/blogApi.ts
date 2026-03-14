import { STRAPI_URL } from "@/lib/env";
import { getAuthData } from "@/lib/authStore";

const UPLOAD_URL = STRAPI_URL.replace("/api", "") + "/api/upload";

/* ---------------------------------------------
   UPLOAD IMAGE (JWT REQUIRED)
--------------------------------------------- */
export async function uploadImage(file: File): Promise<number | null> {
  const auth = getAuthData();
  if (!auth?.jwt) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("files", file);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.jwt}`,
    },
    body: fd,
  });

  const out = await res.json();
  if (!res.ok) throw new Error(out?.error?.message || "Upload failed");

  return out[0]?.id || null;
}

/* ---------------------------------------------
   CREATE BLOG (JWT REQUIRED)
--------------------------------------------- */
export async function createBlog({
  title,
  description,
  content,
  categoryIds,
  coverFile,
}: any) {
  const auth = getAuthData();
  if (!auth?.jwt || !auth?.user) throw new Error("Unauthorized");

  // Upload cover if available
  let coverId = null;
  if (coverFile) {
    coverId = await uploadImage(coverFile);
  }

  // FIXED: Correct endpoint
  const res = await fetch(`${STRAPI_URL}/api/blogs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.jwt}`, // JWT token for authentication
    },
    body: JSON.stringify({
      data: {
        title,
        description,
        content,
        slug: title.toLowerCase().replace(/\s+/g, "-"),

        // Only include cover and category if they exist
        cover: coverId || undefined,
        category: categoryIds || undefined,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to create blog");

  return data.data;
}
