import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email;

    if (!email) {
      // Still return success to prevent account enumeration
      return NextResponse.json({
        success: true,
        message:
          "If this email exists, a password reset link has been sent.",
      });
    }

    const response = await fetch(
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

    // DO NOT parse JSON — Auth0 may return text or empty body
    const text = await response.text();

    // Optional debug (can remove later)
    console.log("Auth0 forgot-password response:", {
      status: response.status,
      body: text,
    });

    // ALWAYS return success (security best practice)
    return NextResponse.json({
      success: true,
      message:
        "If this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // Even on server error, return generic success
    return NextResponse.json({
      success: true,
      message:
        "If this email exists, a password reset link has been sent.",
    });
  }
}
