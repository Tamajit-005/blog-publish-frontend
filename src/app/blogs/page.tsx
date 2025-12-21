import { client } from "@/lib/apolloClient";
import { GET_ALL_POSTS } from "@/lib/queries";
import type { BlogPost } from "@/lib/types";
import BlogsClient from "./BlogsClient";

export default async function BlogsPage() {
  try {
    const result = await client.query<{ blogs: BlogPost[] }>({
      query: GET_ALL_POSTS,
      fetchPolicy: "no-cache",
    });

    // TS-safe fallback
    const blogs: BlogPost[] = result?.data?.blogs ?? [];

    return <BlogsClient blogs={blogs} />;
  } catch (error) {
    console.error("Error fetching blogs:", error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-gray-400">
        Failed to load blogs.
      </div>
    );
  }
}
