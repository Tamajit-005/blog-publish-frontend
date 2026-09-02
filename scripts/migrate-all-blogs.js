import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { createClient } from "@sanity/client";
import { markdownToBlocks } from "../src/lib/markdownToBlocks.ts";
import { findOrCreateAuthor, resolveCategoryRefs, uploadSanityImage } from "../src/lib/sanityHelpers.ts";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "xxv30rrb",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-05-15",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to Mongo");

  const blogs = await mongoose.connection.db.collection("blogs").find({}).toArray();
  console.log(`Found ${blogs.length} blogs in Mongo`);

  // First, ensure all users have Sanity authors
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  console.log(`Found ${users.length} users, ensuring Sanity authors...`);
  for (const u of users) {
    try {
      await findOrCreateAuthor({ auth0Id: u.auth0Id, username: u.username, email: u.email });
      console.log(`  Author ok: ${u.username} (${u.email})`);
    } catch (e) {
      console.error(`  Author failed for ${u.username}:`, e.message);
    }
  }

  let migrated = 0;
  let skipped = 0;

  for (const blog of blogs) {
    const hasSanity = !!blog.sanityId;
    if (hasSanity) {
      console.log(`\nSkipping ${blog.title} — already has sanityId ${blog.sanityId}`);
      skipped++;
      continue;
    }

    // Filter gaming
    const originalCats = blog.categories || [];
    const filteredCats = originalCats.filter((c) => c !== "gaming");
    const removedGaming = originalCats.length !== filteredCats.length;
    if (removedGaming) {
      console.log(`\nMigrating "${blog.title}" — removing gaming: [${originalCats}] -> [${filteredCats}]`);
      if (filteredCats.length === 0) {
        console.log(`  -> No categories left after removing gaming, will import with no categories`);
      }
    } else {
      console.log(`\nMigrating "${blog.title}" — cats [${filteredCats}]`);
    }

    // Check if slug already exists in Sanity
    const existing = await sanityClient.fetch(`*[_type=="post" && slug.current==$slug][0]._id`, { slug: blog.slug });
    if (existing) {
      console.log(`  Skipping — slug "${blog.slug}" already exists in Sanity as ${existing}`);
      skipped++;
      continue;
    }

    try {
      const authorRef = await findOrCreateAuthor(blog.author);
      console.log(`  Author ${blog.author.username} -> ${authorRef._id}`);

      let coverAssetId = null;
      if (blog.coverImage?.startsWith("data:")) {
        const m = blog.coverImage.match(/name=([^;]+);base64,/);
        const fn = m ? decodeURIComponent(m[1]) : "cover.png";
        const r = await uploadSanityImage(blog.coverImage, fn);
        coverAssetId = r.assetId;
        console.log(`  Cover uploaded ${coverAssetId.slice(0, 18)}`);
      } else if (blog.coverImage) {
        console.log(`  Cover is not base64, skipping upload (url: ${blog.coverImage.slice(0, 60)})`);
      }

      const inlineMap = new Map();
      const savedImages = [];
      for (const img of blog.inlineImages || []) {
        if (img.base64?.startsWith("data:")) {
          const m = img.base64.match(/name=([^;]+);base64,/);
          const fn = m ? decodeURIComponent(m[1]) : img.id + ".png";
          const r = await uploadSanityImage(img.base64, fn);
          inlineMap.set(img.placeholder, r.assetId);
          // Also map bare placeholder for markdownToBlocks fallback
          const bare = (img.placeholder || "").slice(2, -1);
          if (bare) inlineMap.set(bare, r.assetId);
          savedImages.push({ ...img, sanityAssetId: r.assetId, sanityUrl: r.url });
          console.log(`  Inline ${img.placeholder} -> ${r.assetId.slice(0, 18)}`);
        } else {
          savedImages.push(img);
        }
      }

      const body = markdownToBlocks(blog.content || "", inlineMap);
      console.log(`  Body blocks: ${body.length}`);

      const catRefs = filteredCats.length ? await resolveCategoryRefs(filteredCats) : [];
      console.log(`  Categories refs: ${catRefs.length}`);

      const doc = {
        _type: "post",
        title: blog.title,
        slug: { _type: "slug", current: blog.slug },
        description: blog.description,
        publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : blog.createdAt ? new Date(blog.createdAt).toISOString() : new Date().toISOString(),
        body,
        author: { _type: "reference", _ref: authorRef._id },
        categories: catRefs,
        ...(coverAssetId ? { image: { _type: "image", asset: { _type: "reference", _ref: coverAssetId }, alt: blog.title } } : {}),
      };

      const created = await sanityClient.create(doc);
      console.log(`  Created Sanity post ${created._id} (${created.slug.current})`);

      // Update Mongo with sanityId and filtered cats
      await mongoose.connection.db.collection("blogs").updateOne(
        { _id: blog._id },
        {
          $set: {
            sanityId: created._id,
            sanityCoverAssetId: coverAssetId,
            inlineImages: savedImages,
            categories: filteredCats,
            status: blog.status === "rejected" ? "rejected" : "published",
            publishedAt: new Date(doc.publishedAt),
          },
        }
      );
      console.log(`  Mongo updated`);
      migrated++;
    } catch (e) {
      console.error(`  Failed for "${blog.title}":`, e.message, e.details || "");
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
