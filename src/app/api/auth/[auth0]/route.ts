import { handleAuth, handleLogin, handleCallback } from "@auth0/nextjs-auth0";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

async function afterCallback(req: NextRequest, session: any) {
  const user = session?.user;

  // Never block login
  if (!user?.sub || !user?.email) {
    console.warn("Missing Auth0 user data");
    return session;
  }

  console.log("✅ afterCallback executed");

  try {
    // Ensure DB is connected
    const conn = await connectToDatabase();
    if (!conn) {
      console.error("⚠️ DB not connected, skipping login tracking");
      return session;
    }

    // Extract login metadata (SERVER SIDE)
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const loginTime = new Date();

    // Username from Auth0 with fallback
    const usernameFromAuth0 =
      user["https://palettepublisher.com/username"] ||
      user.nickname ||
      user.email.split("@")[0];

    // ✅ UPSERT USER + UPDATE ONLY LAST LOGIN FIELDS
    const mongoUser = await User.findOneAndUpdate(
      { auth0Id: user.sub },
      {
        $setOnInsert: {
          auth0Id: user.sub,
          email: user.email,
          username: usernameFromAuth0,
          role: "user",
        },
        $set: {
          lastLoginAt: loginTime,
          lastLoginIp: ipAddress,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log("✅ Last login updated for:", mongoUser.username);

    // Attach Mongo data to session
    session.user.mongoId = mongoUser._id.toString();
    session.user.role = mongoUser.role;
    session.user.username = mongoUser.username;

  } catch (err) {
    // Do NOT break Auth0 callback
    console.error("MongoDB sync failed:", err);
  }

  return session;
}

// Export GET handler for Next.js App Router
export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      screen_hint: "login",
    },
  }),
  callback: handleCallback({ afterCallback }),
});
