import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Destroy session
    session.destroy();

    return NextResponse.redirect(new URL("/", process.env.AUTH0_BASE_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.redirect(new URL("/", process.env.AUTH0_BASE_URL || "http://localhost:3000"));
  }
}
