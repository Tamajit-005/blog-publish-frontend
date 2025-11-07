import { client } from "@/lib/apolloClient";
import { GET_ALL_POSTS } from "@/lib/queries";
import type { BlogPost } from "@/lib/types";
import BlogsClient from "./BlogsClient";

/**
 * Server Component — Fetches all blogs from Strapi
 * Passes data to the client-rendered BlogsClient
 */
export default async function BlogsPage() {
  try {
    const { data } = await client.query<{ blogs: BlogPost[] }>({
      query: GET_ALL_POSTS,
      fetchPolicy: "no-cache",
    });

    const blogs = data?.blogs ?? [];

    return <BlogsClient blogs={blogs} />;
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        Failed to load blogs. Please try again later.
      </div>
    );
  }
}
