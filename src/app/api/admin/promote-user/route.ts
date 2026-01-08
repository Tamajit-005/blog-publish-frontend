import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Only superadmin can promote users
    if (!session?.user?.sub || !session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ auth0Id: session.user.sub });

    if (!currentUser || currentUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmins can promote users" },
        { status: 403 }
      );
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["user", "admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const userToPromote = await User.findOne({ email });

    if (!userToPromote) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    userToPromote.role = role;
    await userToPromote.save();

    console.log(`✅ User ${email} promoted to ${role}`);

    return NextResponse.json({
      message: `User ${email} has been promoted to ${role}`,
      user: {
        username: userToPromote.username,
        email: userToPromote.email,
        role: userToPromote.role,
      },
    });
  } catch (error) {
    console.error("❌ Promotion error:", error);
    return NextResponse.json(
      { error: "Failed to promote user" },
      { status: 500 }
    );
  }
}
