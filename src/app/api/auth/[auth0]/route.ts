import { handleAuth, handleLogin, handleCallback, Session } from "@auth0/nextjs-auth0";
import { NextRequest } from "next/server"; 
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

async function afterCallback(req: NextRequest, session: Session, state: any) {
  const user = session?.user;

  if (!user?.sub || !user?.email) {
    console.warn("Missing Auth0 user data");
    return session;
  }

  console.log("✅ afterCallback executed for Auth0 Login");

  try {
    const conn = await connectToDatabase();
    if (!conn) {
      console.error("⚠️ DB not connected, skipping login tracking");
      return session;
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const loginTime = new Date();

    const usernameFromAuth0 =
      user["https://palettepublisher.com/username"] ||
      user.nickname ||
      user.email.split("@")[0];

    // Upsert User in MongoDB
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

    // CREATE IRON SESSION TO MATCH CUSTOM LOGIN FLOW
    const cookieStore = await cookies();
    const ironSession = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    ironSession.user = {
      sub: user.sub,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      picture: user.picture,
      username: mongoUser.username,
    };

    ironSession.accessToken = session.accessToken;
    ironSession.idToken = session.idToken;
    ironSession.isLoggedIn = true;

    await ironSession.save();

  } catch (err) {
    console.error("MongoDB/Session sync failed:", err);
  }

  return session;
}

// Create the Auth0 handler
const authHandler = handleAuth({
  login: handleLogin((req) => {
    // Safely parse the URL to preserve returnTo behavior
    const url = req.url ? new URL(req.url) : null;
    const returnTo = url?.searchParams.get("returnTo") || "/";
    
    return {
      returnTo,
    };
  }),
  callback: handleCallback({ afterCallback }),
});

// Wrap the handler to await params for Next.js 15 compatibility
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ auth0: string }> }
) {
  const params = await props.params;
  return authHandler(request, { params } as any);
}