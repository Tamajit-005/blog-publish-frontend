import { fetchFromR2, getR2Url } from "@/lib/r2";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN!;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export interface StrapiUploadResult {
  strapiId: number;
  strapiUrl: string;
}

export interface R2UploadResult {
  r2Key: string;
  r2Url: string;
}

/**
 * Computes the permanent public R2 URL for a key without any network call.
 * Use this at upload time to store r2Url alongside r2Key in MongoDB.
 */
export function toR2Url(key: string): string {
  return getR2Url(key);
}

// Bulk upload — all files in ONE POST /api/upload request
export async function bulkR2ToStrapi(
  files: { r2Key: string; filename: string }[]
): Promise<StrapiUploadResult[]> {
  if (files.length === 0) return [];

  // Fetch all R2 blobs in parallel
  const fetched = await Promise.all(
    files.map(({ r2Key }) => fetchFromR2(r2Key))
  );

  // Build a single FormData with all files under the same "files" key
  const form = new FormData();
  for (let i = 0; i < files.length; i++) {
    const { buffer, contentType } = fetched[i];
    const ext = files[i].r2Key.split(".").pop()?.toLowerCase() ?? "jpg";
    const resolvedContentType = CONTENT_TYPES[ext] ?? contentType ?? "image/jpeg";
    form.append(
      "files",
      new Blob([new Uint8Array(buffer)], { type: resolvedContentType }),
      files[i].filename
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Strapi bulk upload failed: ${await res.text()}`);

  const uploaded: { id: number; url: string }[] = await res.json();

  return uploaded.map((f) => ({
    strapiId: f.id,
    strapiUrl: f.url.startsWith("http") ? f.url : `${STRAPI_URL}${f.url}`,
  }));
}

// Single-file upload — thin wrapper around bulkR2ToStrapi
export async function r2ToStrapi(
  r2Key: string,
  filename: string
): Promise<StrapiUploadResult> {
  const results = await bulkR2ToStrapi([{ r2Key, filename }]);
  return results[0];
}