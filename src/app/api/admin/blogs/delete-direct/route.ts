import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/adminAuth";
import dbConnect from "@/lib/mongoose";
import Blog from "@/models/Blog";
import User from "@/models/User";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL!.replace(/\/$/, "");

/* LOGIN OR REGISTER USER IN STRAPI */
async function loginOrRegister(user: any): Promise<{ jwt: string }> {
  let password = user.strapi?.password;

  if (!password) {
    password = crypto.randomBytes(24).toString("hex");
  }

  let res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({identifier: user.email, password})
  });

  if (res.ok) {
    return res.json();
  }

  if (user.strapi?.password) {
    throw new Error("Stored Strapi credentials are invalid");
  }

  res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: user.email,
      username: user.username,
      password
    })
  });

  if (!res.ok) {
    throw new Error(`Strapi register failed: ${await res.text()}`);
  }

  const data = await res.json();

  user.strapi = {
    userId: data.user?.id,
    password
  };

  await user.save();

  return data;
}

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
      return NextResponse.json(
        { error: "Blog ID required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return NextResponse.json(
        { error: "Blog not found" },
        { status: 404 }
      );
    }

    const user = await User.findOne({ email: blog.author.email })
      .select("+strapi.password");

    if (!user) {
      return NextResponse.json(
        { error: "Author not found" },
        { status: 404 }
      );
    }

    const { jwt } = await loginOrRegister(user);

    /* ===============================
       DELETE FROM STRAPI
       =============================== */

    console.log("Searching Strapi blog with slug:", blog.slug);

    const findRes = await fetch(
      `${STRAPI_URL}/api/blogs?filters[slug][$eq]=${blog.slug}&publicationState=preview`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
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

      const documentId = entry.documentId;
      const numericId = entry.id;

      console.log("Deleting Strapi blog:", documentId || numericId);

      let deleteRes = await fetch(
        `${STRAPI_URL}/api/blogs/${documentId || numericId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      );

      if (!deleteRes.ok && documentId) {
        deleteRes = await fetch(
          `${STRAPI_URL}/api/blogs/${numericId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${jwt}`
            }
          }
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
    }
    else {
      console.log("Blog not found in Strapi, skipping");
    }

    /* ===============================
       DELETE FROM MONGODB
       =============================== */

    await Blog.findByIdAndDelete(blogId);

    return NextResponse.json({
      message: "Blog deleted from Strapi and MongoDB"
    });

  }
  catch (error:any) {

    console.error("Delete direct error:", error);

    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}