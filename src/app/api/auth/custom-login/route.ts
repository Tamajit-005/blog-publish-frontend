import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 🔐 Authenticate with Auth0
    const tokenResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "http://auth0.com/oauth/grant-type/password-realm",
          username: email,
          password: password,
          client_id: process.env.AUTH0_CLIENT_ID,
          client_secret: process.env.AUTH0_CLIENT_SECRET,
          realm: "Username-Password-Authentication",
          scope: "openid profile email",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Authentication failed:", tokenData);

      let errorMessage = "Invalid email or password";

      if (tokenData.error === "invalid_grant" || tokenData.error === "invalid_user_password") {
        errorMessage = "Invalid email or password";
      } else if (tokenData.error === "access_denied") {
        errorMessage = "Account locked or disabled";
      } else if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      }

      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    console.log("Authentication successful");

    // Step 2: Get user profile
    const userInfoResponse = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();
    console.log("User profile retrieved:", userInfo.email);

    // Determine username
    const authUsername =
      userInfo["https://palettepublisher.com/username"] ||
      userInfo.nickname ||
      userInfo.email.split("@")[0];

    // 🌐 Capture IP
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // 🗄️ Sync MongoDB + UPDATE LOGIN TIME
    await connectToDatabase();

    const mongoUser = await User.findOneAndUpdate(
      { auth0Id: userInfo.sub },
      {
        $setOnInsert: {
          auth0Id: userInfo.sub,
          email: userInfo.email,
          username: authUsername,
          role: "user",
        },
        $set: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      },
      { upsert: true, new: true }
    );

    // 🍪 Create session
    const response = NextResponse.json({
      success: true,
      user: {
        sub: userInfo.sub,
        email: userInfo.email,
        username: mongoUser.username,
      },
    });

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    session.user = {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      nickname: userInfo.nickname,
      picture: userInfo.picture,
      username: mongoUser.username,
    };

    session.accessToken = tokenData.access_token;
    session.idToken = tokenData.id_token;
    session.isLoggedIn = true;

    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
