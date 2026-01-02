import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    // Get session from iron-session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.user?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return username from session (already from MongoDB)
    if (session.user.username) {
      return NextResponse.json({
        username: session.user.username,
        email: session.user.email,
      });
    }

    // Fallback: fetch from MongoDB if not in session
    await dbConnect();
    const user = await User.findOne({ auth0Id: session.user.sub });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching username:", error);
    return NextResponse.json(
      { error: "Failed to fetch username" },
      { status: 500 }
    );
  }
}
