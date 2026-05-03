import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Derives the public CDN URL for an R2 key.
 * Set R2_PUBLIC_URL in your env to your bucket's public domain,
 * e.g. https://pub-xxxxxxxx.r2.dev  or  https://assets.yourdomain.com
 * No trailing slash.
 */
export function getR2Url(key: string): string {
  const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${base}/${key}`;
}

/** Upload a buffer to R2. Returns the r2Key. */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  console.log(`[R2 PutObject] ${key}`);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

/** Fetch a file from R2 as a Buffer. */
export async function fetchFromR2(
  key: string
): Promise<{ buffer: Buffer; contentType: string }> {
  console.log(`[R2 GetObject] ${key}`);
  const res = await r2Client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const contentType = res.ContentType ?? "image/jpeg";
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as any) {
    chunks.push(chunk);
  }
  return { buffer: Buffer.concat(chunks), contentType };
}

/** Delete a single file from R2. Non-fatal if missing. */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    console.log(`[R2 DeleteObject] ${key}`);
    await r2Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    );
  } catch (e) {
    console.warn(`R2 delete failed for key "${key}":`, e);
  }
}

/**
 * Bulk delete up to 1000 R2 keys in a single API call.
 * Use this instead of Promise.all(keys.map(deleteFromR2)) wherever possible.
 * DeleteObjects is free (no Class A or B charge).
 */
export async function bulkDeleteFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  // R2 supports max 1000 keys per DeleteObjects call
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }

  for (const chunk of chunks) {
    console.log(`[R2 DeleteObjects] bulk deleting ${chunk.length} key(s):`, chunk);
    try {
      const res = await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
      if (res.Errors && res.Errors.length > 0) {
        console.warn(`[R2 DeleteObjects] some keys failed:`, res.Errors);
      }
    } catch (e) {
      console.warn(`[R2 DeleteObjects] bulk delete failed:`, e);
    }
  }
}