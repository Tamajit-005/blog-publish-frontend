import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    // 🔐 Read session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    const email = session.user?.email;

    // 🔒 Security: always return success
    if (!email) {
      return NextResponse.json({
        success: true,
        message:
          "If your account uses a password, a reset link has been sent.",
      });
    }

    // 🔁 Trigger Auth0 reset password email
    await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/dbconnections/change_password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.AUTH0_CLIENT_ID,
          email,
          connection: "Username-Password-Authentication",
        }),
      }
    );

    // ✅ Always respond with success
    return NextResponse.json({
      success: true,
      message:
        "If your account uses a password, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    // 🔒 Still return success (avoid account enumeration)
    return NextResponse.json({
      success: true,
      message:
        "If your account uses a password, a reset link has been sent.",
    });
  }
}
