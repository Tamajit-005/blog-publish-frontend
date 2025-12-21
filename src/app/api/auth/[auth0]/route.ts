import { handleAuth, handleLogin, handleCallback } from "@auth0/nextjs-auth0";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

async function afterCallback(req: NextRequest, session: any) {
  try {
    const user = session.user;

    if (!user?.sub || !user?.email) {
      console.warn("Missing Auth0 user data");
      return session;
    }

    // 🔍 Debug logging
    console.log("Callback - Full user object:", JSON.stringify(user, null, 2));
    console.log("Callback - Custom claim value:", user["https://palettepublisher.com/username"]);
    console.log("Callback - Nickname:", user.nickname);
    console.log("Callback - Email:", user.email);

    await connectToDatabase();

    let mongoUser = await User.findOne({ auth0Id: user.sub });

    // Username from ID token (custom claim) with fallbacks
    const usernameFromAuth0 =
      user["https://palettepublisher.com/username"] ||
      user.nickname ||
      user.email.split("@")[0];

    console.log("Final username to save:", usernameFromAuth0);

    if (!mongoUser) {
      // Safety net: Create if somehow missing from signup
      mongoUser = await User.create({
        auth0Id: user.sub,
        email: user.email,
        username: usernameFromAuth0, // Keep original case
        role: "user",
      });

      console.log("Mongo user created (via callback):", mongoUser.username);
    } else {
      console.log("User already exists:", mongoUser.username);
    }

    // Attach Mongo data to session
    session.user.mongoId = mongoUser._id.toString();
    session.user.role = mongoUser.role;
    session.user.username = mongoUser.username;

  } catch (err) {
    console.error("MongoDB sync failed:", err);
  }

  return session;
}

// Export GET handler for Next.js 15
export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      screen_hint: "login",
    },
  }),
  callback: handleCallback({ afterCallback }),
});
