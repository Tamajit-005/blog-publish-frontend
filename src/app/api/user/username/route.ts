import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session?.user?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔥 ALWAYS read from MongoDB to get latest role
    await dbConnect();

    const user = await User.findOne({ auth0Id: session.user.sub }).lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // 🔄 Sync session with DB (important after promotion)
    session.user.username = user.username;
    session.user.email = user.email;
    session.user.role = user.role;
    await session.save();

    // ✅ Return role to frontend
    return NextResponse.json({
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
