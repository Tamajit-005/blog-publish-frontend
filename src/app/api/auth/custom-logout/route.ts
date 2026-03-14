import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  console.log("LOGOUT ROUTE HIT");

  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    console.log("🧾 Session at logout:", session);

    const auth0Id = session.user?.sub;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (auth0Id) {
      const conn = await connectToDatabase();
      if (conn) {
        const updatedUser = await User.findOneAndUpdate(
          { auth0Id },
          {
            $set: {
              lastLogoutAt: new Date(),
              lastLogoutIp: ipAddress,
            },
          },
          { new: true }
        );

        console.log("Mongo after logout update:", {
          user: updatedUser?.username,
          lastLogoutAt: updatedUser?.lastLogoutAt,
          lastLogoutIp: updatedUser?.lastLogoutIp,
        });
      }
    }

    // Destroy session AFTER DB update
    session.destroy();

    // IMPORTANT: Use 303 redirect (safe for logout)
    return NextResponse.redirect(
      new URL("/", process.env.AUTH0_BASE_URL || "http://localhost:3000"),
      { status: 303 }
    );
  } catch (error) {
    console.error("❌ Logout error:", error);
    return NextResponse.redirect(
      new URL("/", process.env.AUTH0_BASE_URL || "http://localhost:3000"),
      { status: 303 }
    );
  }
}
