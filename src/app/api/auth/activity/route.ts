import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { auth0Id, type } = await req.json(); // type = "login" | "logout"

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ error: "DB not connected" }, { status: 500 });
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const update =
      type === "login"
        ? {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
          }
        : {
            lastLogoutAt: new Date(),
            lastLogoutIp: ipAddress,
          };

    await User.findOneAndUpdate(
      { auth0Id },
      { $set: update },
      { new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("User activity update failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
